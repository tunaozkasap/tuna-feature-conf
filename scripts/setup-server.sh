#!/usr/bin/env bash
# Sets up the Scaleway server for the service, from your PC: copies deploy/server to the server and runs its
# setup.sh there as root. Run it once before the first deployment, and again after changing a file in
# deploy/server (it is safe to repeat). See deploy/README.md.
#
#   bash scripts/setup-server.sh
#
# Settings (environment variables, all optional):
#   SERVER                  where to log in (default root@51.15.205.198)
#   SSH_KEY                 the admin key for that login (default ~/.ssh/scaleway_feature_conf)
#   SITE_NAME               the DNS name for the HTTPS certificate (default the server's Scaleway name)
#   DEPLOY_PUBLIC_KEY_FILE  the public half of the key GitHub Actions deploys with
#                           (default ~/.ssh/feature_conf_deploy.pub, skipped when it doesn't exist)
set -euo pipefail

SERVER="${SERVER:-root@51.15.205.198}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/scaleway_feature_conf}"
SITE_NAME="${SITE_NAME:-b635306c-bda8-49bb-842e-50044d5398a3.pub.instances.scw.cloud}"
DEPLOY_PUBLIC_KEY_FILE="${DEPLOY_PUBLIC_KEY_FILE:-$HOME/.ssh/feature_conf_deploy.pub}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_OPTIONS=(-i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes)
REMOTE_DIR=/root/feature-conf-setup

DEPLOY_PUBLIC_KEY=""
if [[ -f "$DEPLOY_PUBLIC_KEY_FILE" ]]; then
  DEPLOY_PUBLIC_KEY="$(cat "$DEPLOY_PUBLIC_KEY_FILE")"
fi

echo "setup-server: copying deploy/server to $SERVER:$REMOTE_DIR"
ssh "${SSH_OPTIONS[@]}" "$SERVER" "rm -rf $REMOTE_DIR && mkdir -p $REMOTE_DIR"
scp "${SSH_OPTIONS[@]}" -q "$ROOT"/deploy/server/* "$SERVER:$REMOTE_DIR/"

echo "setup-server: running setup.sh on the server"
# printf %q quotes each value for the remote shell
ssh "${SSH_OPTIONS[@]}" "$SERVER" \
  "SITE_NAME=$(printf %q "$SITE_NAME") DEPLOY_PUBLIC_KEY=$(printf %q "$DEPLOY_PUBLIC_KEY") bash $REMOTE_DIR/setup.sh"
