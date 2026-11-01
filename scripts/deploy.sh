#!/usr/bin/env bash
# Deploys a built service jar to the Scaleway server: uploads it as the deploy user, then runs activate-release.sh
# there, which switches to it and goes back to the previous release if it doesn't come up. GitHub Actions runs this
# after every merge to main (.github/workflows/deploy.yml); it works the same from your PC. See deploy/README.md.
#
#   mvn clean install -DskipTests     (or the full build with tests)
#   bash scripts/deploy.sh
#
# Settings (environment variables, all optional):
#   JAR        the jar to deploy (default service/target/service-0.0.1-SNAPSHOT.jar)
#   RELEASE    the release name (default <UTC date and time>-<git commit>, e.g. 20261101-1203-7ac8250)
#   SERVER     (default deploy@51.15.205.198)
#   SSH_KEY    the deploy key (default ~/.ssh/feature_conf_deploy)
#   SITE_URL   checked after the switch (default https://<the server's Scaleway name>:8443/)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAR="${JAR:-$ROOT/service/target/service-0.0.1-SNAPSHOT.jar}"
RELEASE="${RELEASE:-$(date -u +%Y%m%d-%H%M)-$(git -C "$ROOT" rev-parse --short HEAD)}"
SERVER="${SERVER:-deploy@51.15.205.198}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/feature_conf_deploy}"
SITE_URL="${SITE_URL:-https://b635306c-bda8-49bb-842e-50044d5398a3.pub.instances.scw.cloud:8443/}"

# deploy/known_hosts holds the server's own key: SSH refuses to talk to any other machine at that address
SSH_OPTIONS=(-i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes
  -o UserKnownHostsFile="$ROOT/deploy/known_hosts" -o StrictHostKeyChecking=yes)

if [[ ! -f "$JAR" ]]; then
  echo "deploy: no jar at $JAR; build first (mvn clean install -DskipTests)" >&2
  exit 1
fi

echo "deploy: uploading $(basename "$JAR") as release $RELEASE to $SERVER"
scp "${SSH_OPTIONS[@]}" -q "$JAR" "$SERVER:upload/$RELEASE.jar"

echo "deploy: switching the server to $RELEASE"
ssh "${SSH_OPTIONS[@]}" "$SERVER" sudo /opt/feature-conf/bin/activate-release.sh "$RELEASE"

# From outside, with the certificate checked (activate-release.sh could only check the service on the server itself)
status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 30 "${SITE_URL}api-docs" || true)"
if [[ "$status" != 200 ]]; then
  echo "deploy: ${SITE_URL}api-docs answered '$status' instead of 200" >&2
  exit 1
fi
echo "deploy: $RELEASE is live at $SITE_URL"
