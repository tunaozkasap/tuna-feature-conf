# Deployment to the Scaleway server

The service runs on the Scaleway Instance `scw-loving-ardinghelli` (STARDUST1-S: 1 vCPU, 1 GB, Ubuntu 22.04,
`51.15.205.198`). The same machine is an OpenVPN server, which keeps ports 443/tcp and 1194/udp.

**Address:** https://b635306c-bda8-49bb-842e-50044d5398a3.pub.instances.scw.cloud:8443 (public, no password)

```
internet ──https :8443──▶ java -jar current.jar (profile prod), certificate from /opt/feature-conf/tls
         ──http  :80 ───▶ certbot, only for the few seconds of a certificate check (otherwise nothing listens)
```

- **The service serves HTTPS itself** on 8443 (`application-prod.yml`), open to everyone. There is no HTTP address:
  type `https://`. The H2 console is off, and error responses leave out the technical details (the evidence on the
  server still has them).
- **certbot** gets the Let's Encrypt certificate and renews it (`certbot.timer`, twice a day; a certificate is
  renewed 30 days before it expires). Its deploy hook copies the new files to `/opt/feature-conf/tls`, and the service
  switches to them by itself (`reload-on-update`): no restart, so a renewal doesn't reset the data.
- **The data** is the in-memory demo data, as locally: every deployment and restart starts fresh.
- **Releases** are kept in `/opt/feature-conf/releases`; `/opt/feature-conf/current.jar` points to the one that runs.

## Files

| File | What it is |
|---|---|
| `server/setup.sh` | One-time setup, run as root on the server: swap, Java 21, certbot and the certificate, users, systemd service |
| `server/feature-conf.service` | The systemd service that runs `current.jar` |
| `server/certbot-deploy-hook.sh` | After each renewal, copies the certificate where the service can read it |
| `server/activate-release.sh` | Switches to an uploaded jar, checks it answers, goes back to the previous one if not |
| `known_hosts` | The server's SSH host key, so a deployment never talks to another machine at that address |
| `../scripts/setup-server.sh` | Runs `server/setup.sh` on the server from your PC |
| `../scripts/deploy.sh` | Uploads a built jar and runs `activate-release.sh`, then checks the site answers from outside |
| `../.github/workflows/deploy.yml` | GitHub Actions: after every merge to `main`, build, both test suites, then `deploy.sh` |

## Setting up the server (once, and after changing a file in `server/`)

```bash
bash scripts/setup-server.sh
```

It logs in as root with `~/.ssh/scaleway_feature_conf` and is safe to run again. Settings are environment variables
listed at the top of the script (`SITE_NAME`, ...). It also removes Caddy, which the first version of this setup
used for HTTPS and a password.

## Deploying

**Automatically:** every merge to `main` runs the workflow *Build, test and deploy* (Actions tab on GitHub). A
failing test stops it before anything is deployed; a release that doesn't come up is replaced by the previous one
and the run fails. *Run workflow* on the Actions tab starts it by hand.

It needs the repository secret `SCALEWAY_DEPLOY_KEY`, the private half of `~/.ssh/feature_conf_deploy` (the public
half is what `setup.sh` gives the `deploy` user). To set or replace it:

```bash
gh secret set SCALEWAY_DEPLOY_KEY < ~/.ssh/feature_conf_deploy
```

**By hand from your PC**, with the same key:

```bash
mvn clean install -DskipTests
bash scripts/deploy.sh
```

## Users on the server

| User | Can |
|---|---|
| `root` | Everything. Log in with `~/.ssh/scaleway_feature_conf` (or your MobaXterm key). |
| `deploy` | Upload jars to `~/upload` and run `sudo /opt/feature-conf/bin/activate-release.sh <release>`, nothing else as root. Logs in with the deploy key only. Can read the service's log. |
| `feature-conf` | Runs the service. Can't log in. Reads the certificate copies in `/opt/feature-conf/tls`. |

## On the server

```bash
systemctl status feature-conf                     # running?
journalctl -u feature-conf -o cat -f              # its output as it happens
journalctl -u feature-conf -o cat | grep '^{' | jq 'select(.evidence.requestId=="<id>") | .evidence'
ls -lt /opt/feature-conf/releases                 # the kept releases; current.jar points to one of them
certbot certificates                              # the certificate and its expiry date
certbot renew --dry-run                           # checks that renewal works, without changing anything
```

Going back to an older release by hand: point `current.jar` at it and restart.

```bash
ln -sfn /opt/feature-conf/releases/<release>.jar /opt/feature-conf/current.jar && systemctl restart feature-conf
```
