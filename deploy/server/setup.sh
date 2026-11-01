#!/usr/bin/env bash
# One-time setup of the Scaleway server, run as root ON the server by scripts/setup-server.sh. Safe to run again:
# every step checks what is already there, so a second run only updates the files from deploy/server.
#
# It installs Java 21 and Caddy, adds a swap file, creates the users, folders and the systemd service, and writes
# Caddy's configuration (HTTPS on HTTPS_PORT, with a password prompt). It does not deploy the service itself:
# that is activate-release.sh's job. It leaves OpenVPN, SSH and the firewall as they are.
#
# Settings, from the environment:
#   SITE_NAME          the server's DNS name, used for the HTTPS certificate (required)
#   HTTPS_PORT         the HTTPS port; 443 belongs to OpenVPN on this server (default 8443)
#   UI_USER            the username for the password prompt (default admin)
#   DEPLOY_PUBLIC_KEY  the public SSH key GitHub Actions deploys with; the deploy user gets only this key (optional)
set -euo pipefail

SITE_NAME="${SITE_NAME:?SITE_NAME is required, e.g. b635306c-....pub.instances.scw.cloud}"
HTTPS_PORT="${HTTPS_PORT:-8443}"
UI_USER="${UI_USER:-admin}"
DEPLOY_PUBLIC_KEY="${DEPLOY_PUBLIC_KEY:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR=/opt/feature-conf
PASSWORD_FILE=/root/feature-conf-ui-password.txt

step() { echo; echo "==== $*"; }

if [[ "$(id -u)" != 0 ]]; then
  echo "setup: run this as root" >&2
  exit 1
fi
if [[ ! "$SITE_NAME" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "setup: SITE_NAME must be a plain DNS name (got '$SITE_NAME')" >&2
  exit 1
fi
if [[ ! "$HTTPS_PORT" =~ ^[0-9]+$ || "$HTTPS_PORT" == 443 ]]; then
  echo "setup: HTTPS_PORT must be a port number other than 443 (OpenVPN uses 443 here)" >&2
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive

# ---- Swap: 1 GB of memory is shared by OpenVPN, Java and Caddy, so give the system room before anything runs out ---

step "Swap file"
if swapon --show | grep -q .; then
  echo "swap already on"
else
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Use the swap only when memory is really short
  echo 'vm.swappiness=10' > /etc/sysctl.d/90-feature-conf-swap.conf
  sysctl -q -p /etc/sysctl.d/90-feature-conf-swap.conf
fi

# ---- Packages: Java 21 from Ubuntu, Caddy from Caddy's own repository (the official way to install it) -------------

step "Java 21, curl, jq"
apt-get update -q
apt-get install -y -q openjdk-21-jre-headless curl jq
java -version 2>&1 | head -1

step "Caddy"
if ! command -v caddy > /dev/null; then
  apt-get install -y -q debian-keyring debian-archive-keyring apt-transport-https gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi
caddy version

# ---- Users: feature-conf runs the service, deploy only uploads jars and runs activate-release.sh ---------------------

step "Users and folders"
id feature-conf > /dev/null 2>&1 || useradd --system --no-create-home --home-dir "$APP_DIR" --shell /usr/sbin/nologin feature-conf
id deploy > /dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
# deploy may read the service's output (journalctl -u feature-conf) without sudo
usermod -aG systemd-journal deploy

install -d -o root -g feature-conf -m 0750 "$APP_DIR" "$APP_DIR/releases"
install -d -o root -g root -m 0755 "$APP_DIR/bin"
install -d -o deploy -g deploy -m 0700 /home/deploy/upload
install -o root -g root -m 0755 "$HERE/activate-release.sh" "$APP_DIR/bin/activate-release.sh"

# The one thing deploy may do as root. Checked with visudo before it is put in place: a broken sudoers file locks sudo.
cat > /tmp/feature-conf-deploy.sudoers <<'EOF'
# Written by tuna-feature-conf deploy/server/setup.sh
deploy ALL=(root) NOPASSWD: /opt/feature-conf/bin/activate-release.sh
EOF
visudo -cf /tmp/feature-conf-deploy.sudoers
install -o root -g root -m 0440 /tmp/feature-conf-deploy.sudoers /etc/sudoers.d/feature-conf-deploy
rm -f /tmp/feature-conf-deploy.sudoers

if [[ -n "$DEPLOY_PUBLIC_KEY" ]]; then
  if [[ ! "$DEPLOY_PUBLIC_KEY" =~ ^ssh-(ed25519|rsa)\ [A-Za-z0-9+/=]+(\ .*)?$ ]]; then
    echo "setup: DEPLOY_PUBLIC_KEY doesn't look like a public SSH key" >&2
    exit 1
  fi
  install -d -o deploy -g deploy -m 0700 /home/deploy/.ssh
  echo "$DEPLOY_PUBLIC_KEY" > /home/deploy/.ssh/authorized_keys
  chown deploy:deploy /home/deploy/.ssh/authorized_keys
  chmod 600 /home/deploy/.ssh/authorized_keys
  echo "deploy can log in with: $(echo "$DEPLOY_PUBLIC_KEY" | cut -d' ' -f3-)"
else
  echo "no DEPLOY_PUBLIC_KEY given: deploy can't log in yet"
fi

# ---- The service: installed and switched on at boot; it starts with the first deployment ---------------------------

step "systemd service"
install -o root -g root -m 0644 "$HERE/feature-conf.service" /etc/systemd/system/feature-conf.service
systemctl daemon-reload
systemctl enable feature-conf
if [[ -e "$APP_DIR/current.jar" ]]; then
  systemctl restart feature-conf
  echo "restarted with $(readlink -f "$APP_DIR/current.jar")"
else
  echo "no release deployed yet"
fi

# ---- Caddy: HTTPS and the password prompt -------------------------------------------------------------------------

step "Password for the UI and API"
if [[ -s /etc/caddy/feature-conf-users ]]; then
  echo "kept the existing password (delete /etc/caddy/feature-conf-users and run again for a new one)"
else
  PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  echo "$UI_USER $(caddy hash-password --plaintext "$PASSWORD")" > /etc/caddy/feature-conf-users
  printf 'user:     %s\npassword: %s\n' "$UI_USER" "$PASSWORD" > "$PASSWORD_FILE"
  chmod 600 "$PASSWORD_FILE"
  echo "new password written to $PASSWORD_FILE (readable by root only)"
fi
chown root:caddy /etc/caddy/feature-conf-users
chmod 640 /etc/caddy/feature-conf-users

step "Caddy configuration"
sed -e "s/__SITE_NAME__/$SITE_NAME/g" -e "s/__HTTPS_PORT__/$HTTPS_PORT/g" "$HERE/Caddyfile" > /tmp/feature-conf.Caddyfile
caddy validate --adapter caddyfile --config /tmp/feature-conf.Caddyfile
install -o root -g root -m 0644 /tmp/feature-conf.Caddyfile /etc/caddy/Caddyfile
rm -f /tmp/feature-conf.Caddyfile
systemctl enable caddy
systemctl reload-or-restart caddy

step "Done"
echo "Site:     https://$SITE_NAME:$HTTPS_PORT (the certificate can take a minute on the first run)"
echo "Password: cat $PASSWORD_FILE"
