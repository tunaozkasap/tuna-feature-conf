#!/usr/bin/env bash
# Switches the server to an uploaded jar, and back to the previous one when the new one doesn't come up.
# Installed as /opt/feature-conf/bin/activate-release.sh by setup.sh, owned by root. The deploy user may run it
# with sudo (and nothing else), after uploading the jar:
#
#   scp service.jar deploy@<server>:upload/<release>.jar
#   ssh deploy@<server> sudo /opt/feature-conf/bin/activate-release.sh <release>
#
# <release> is a name such as 20261101-1203-7ac8250. The last 5 releases are kept in /opt/feature-conf/releases.
set -euo pipefail

RELEASE="${1:-}"
UPLOAD_DIR=/home/deploy/upload
APP_DIR=/opt/feature-conf
RELEASES_DIR="$APP_DIR/releases"
CURRENT="$APP_DIR/current.jar"
# --insecure: the certificate is for the public name, not 127.0.0.1. deploy.sh checks it from outside afterwards.
HEALTH_URL=https://127.0.0.1:8443/api-docs
STARTUP_SECONDS=180
RELEASES_KEPT=5

# ---- Checks: this runs as root on input from the deploy user, so accept only a plain name and a plain file --------

if [[ ! "$RELEASE" =~ ^[A-Za-z0-9._-]{1,80}$ ]]; then
  echo "activate-release: give a release name made of letters, digits, '.', '_' and '-' (got '$RELEASE')" >&2
  exit 2
fi
UPLOADED="$UPLOAD_DIR/$RELEASE.jar"
if [[ ! -f "$UPLOADED" || -L "$UPLOADED" ]]; then
  echo "activate-release: $UPLOADED is not an uploaded file" >&2
  exit 2
fi

# ---- Wait until the service answers, or give up -----------------------------------------------------------------

wait_until_healthy() {
  local waited=0
  while (( waited < STARTUP_SECONDS )); do
    if curl --silent --fail --insecure --output /dev/null "$HEALTH_URL"; then
      echo "activate-release: the service answers after ${waited}s"
      return 0
    fi
    if systemctl is-failed --quiet feature-conf; then
      echo "activate-release: the service stopped while starting" >&2
      return 1
    fi
    sleep 3
    waited=$(( waited + 3 ))
  done
  echo "activate-release: the service did not answer within ${STARTUP_SECONDS}s" >&2
  return 1
}

# ---- Switch to the new jar ---------------------------------------------------------------------------------------

# The jar that runs now; empty before the first deployment (-e: only when the link and its target exist)
PREVIOUS="$(readlink -e "$CURRENT" || true)"
install -o root -g feature-conf -m 0640 "$UPLOADED" "$RELEASES_DIR/$RELEASE.jar"
rm -f "$UPLOADED"
ln -sfn "$RELEASES_DIR/$RELEASE.jar" "$CURRENT"
echo "activate-release: starting $RELEASE (previous: ${PREVIOUS:-none})"
systemctl restart feature-conf

if wait_until_healthy; then
  # Keep the newest releases, and never delete the one that runs
  ls -1t "$RELEASES_DIR"/*.jar | tail -n +$(( RELEASES_KEPT + 1 )) | while read -r old; do
    if [[ "$old" != "$(readlink -f "$CURRENT")" ]]; then
      rm -f "$old"
    fi
  done
  echo "activate-release: $RELEASE is live"
  exit 0
fi

# ---- The new jar didn't come up: show why, then go back to the previous one --------------------------------------

echo "activate-release: last lines of the failed start:" >&2
journalctl -u feature-conf --no-pager -o cat -n 60 >&2 || true

if [[ -n "$PREVIOUS" && -f "$PREVIOUS" && "$PREVIOUS" != "$RELEASES_DIR/$RELEASE.jar" ]]; then
  echo "activate-release: going back to $(basename "$PREVIOUS")" >&2
  ln -sfn "$PREVIOUS" "$CURRENT"
  systemctl restart feature-conf
  if wait_until_healthy; then
    echo "activate-release: the previous release runs again" >&2
  else
    echo "activate-release: the previous release did not come up either" >&2
  fi
else
  echo "activate-release: no previous release to go back to" >&2
fi
exit 1
