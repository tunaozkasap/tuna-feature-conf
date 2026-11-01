#!/usr/bin/env bash
# certbot deploy hook: after the certificate is issued or renewed, copy it to /opt/feature-conf/tls, where the service
# (user feature-conf) can read it; certbot's own copies are root-only. The service notices the new files and switches
# to them by itself (reload-on-update in application-prod.yml), without a restart.
#
# Installed as /etc/letsencrypt/renewal-hooks/deploy/feature-conf.sh by setup.sh, which also runs it once after the
# first certificate. certbot sets RENEWED_LINEAGE to the certificate's folder, e.g. /etc/letsencrypt/live/<name>.
set -euo pipefail

LINEAGE="${RENEWED_LINEAGE:?RENEWED_LINEAGE is set by certbot}"
TLS_DIR=/opt/feature-conf/tls

install -d -o root -g feature-conf -m 0750 "$TLS_DIR"
# Copy under a temporary name first, then rename: the service never reads half-written files
install -o root -g feature-conf -m 0640 "$LINEAGE/fullchain.pem" "$TLS_DIR/fullchain.pem.new"
install -o root -g feature-conf -m 0640 "$LINEAGE/privkey.pem" "$TLS_DIR/privkey.pem.new"
mv -f "$TLS_DIR/fullchain.pem.new" "$TLS_DIR/fullchain.pem"
mv -f "$TLS_DIR/privkey.pem.new" "$TLS_DIR/privkey.pem"
echo "certbot-deploy-hook: copied the certificate from $LINEAGE to $TLS_DIR"
