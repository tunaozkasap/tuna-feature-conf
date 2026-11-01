#!/usr/bin/env bash
# One-time setup of the Scaleway server, run as root ON the server by scripts/setup-server.sh. Safe to run again:
# every step checks what is already there, so a second run only updates the files from deploy/server.
#
# It installs Java 21 and certbot, adds a swap file, creates the users, folders and the systemd service, and gets the
# HTTPS certificate the service serves itself (on 8443, public, no password). It does not deploy the service itself:
# that is activate-release.sh's job. It leaves OpenVPN, SSH and the firewall as they are.
#
# Settings, from the environment:
#   SITE_NAME          the server's DNS name, for the HTTPS certificate (required)
#   DEPLOY_PUBLIC_KEY  the public SSH key GitHub Actions deploys with; the deploy user gets only this key (optional)
set -euo pipefail

SITE_NAME="${SITE_NAME:?SITE_NAME is required, e.g. b635306c-....pub.instances.scw.cloud}"
DEPLOY_PUBLIC_KEY="${DEPLOY_PUBLIC_KEY:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR=/opt/feature-conf

step() { echo; echo "==== $*"; }

if [[ "$(id -u)" != 0 ]]; then
  echo "setup: run this as root" >&2
  exit 1
fi
if [[ ! "$SITE_NAME" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "setup: SITE_NAME must be a plain DNS name (got '$SITE_NAME')" >&2
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive

# ---- Swap: 1 GB of memory is shared by OpenVPN and Java, so give the system room before anything runs out ----------

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

# ---- Caddy: the first version of this setup put Caddy (HTTPS and a password) in front. Take it away again. ----------

step "Caddy from the earlier setup"
if dpkg -s caddy > /dev/null 2>&1; then
  systemctl disable --now caddy || true
  apt-get purge -y -q caddy
  echo "removed Caddy"
else
  echo "not installed"
fi
rm -f /etc/apt/sources.list.d/caddy-stable.list /usr/share/keyrings/caddy-stable-archive-keyring.gpg
rm -rf /etc/caddy /var/lib/caddy
rm -f /root/feature-conf-ui-password.txt

# ---- Packages: Java 21 and certbot, both from Ubuntu ---------------------------------------------------------------

step "Java 21, certbot, curl, jq"
apt-get update -q
apt-get install -y -q openjdk-21-jre-headless certbot curl jq
java -version 2>&1 | head -1
certbot --version

# ---- Users: feature-conf runs the service, deploy only uploads jars and runs activate-release.sh ---------------------

step "Users and folders"
id feature-conf > /dev/null 2>&1 || useradd --system --no-create-home --home-dir "$APP_DIR" --shell /usr/sbin/nologin feature-conf
id deploy > /dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
# deploy may read the service's output (journalctl -u feature-conf) without sudo
usermod -aG systemd-journal deploy

install -d -o root -g feature-conf -m 0750 "$APP_DIR" "$APP_DIR/releases" "$APP_DIR/tls"
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

# ---- HTTPS certificate: certbot gets it from Let's Encrypt and renews it (certbot.timer, twice a day) ----------------
# "standalone": certbot answers Let's Encrypt's check on port 80 itself, for the few seconds it takes; nothing else
# listens on port 80 on this server.

step "HTTPS certificate"
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
install -o root -g root -m 0755 "$HERE/certbot-deploy-hook.sh" /etc/letsencrypt/renewal-hooks/deploy/feature-conf.sh
if [[ -d "/etc/letsencrypt/live/$SITE_NAME" ]]; then
  echo "certificate already there (certbot renews it)"
else
  certbot certonly --standalone --non-interactive --agree-tos --register-unsafely-without-email \
    --cert-name "$SITE_NAME" -d "$SITE_NAME"
fi
# Copy it for the service now; after each renewal certbot runs the hook itself
RENEWED_LINEAGE="/etc/letsencrypt/live/$SITE_NAME" /etc/letsencrypt/renewal-hooks/deploy/feature-conf.sh
systemctl enable --now certbot.timer
certbot certificates --cert-name "$SITE_NAME" 2>/dev/null | grep -E "Domains|Expiry" || true

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

step "Done"
echo "Site: https://$SITE_NAME:8443 (once a release with application-prod.yml's HTTPS settings is deployed)"
