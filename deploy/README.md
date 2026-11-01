# Deployment to the Scaleway server

The service runs on the Scaleway Instance `scw-loving-ardinghelli` (STARDUST1-S: 1 vCPU, 1 GB, Ubuntu 22.04,
`51.15.205.198`). The same machine is an OpenVPN server, which keeps ports 443/tcp and 1194/udp.

```
internet ──https :8443──▶ Caddy ──http──▶ 127.0.0.1:8080  java -jar current.jar (profile prod)
         ──http  :80 ───▶ Caddy (Let's Encrypt checks, redirect to https)
```

- **Caddy** gives HTTPS with a free Let's Encrypt certificate it renews itself, and asks for a username and password
  for everything (UI, API, Swagger UI).
- **The service** listens on `127.0.0.1` only (`application-prod.yml`), so it can't be reached around Caddy, and the
  H2 console is off. The data is the in-memory demo data, as locally: every restart starts fresh.
- **Releases** are kept in `/opt/feature-conf/releases`; `/opt/feature-conf/current.jar` points to the one that runs.

## Files

| File | What it is |
|---|---|
| `server/setup.sh` | One-time setup, run as root on the server: swap, Java 21, Caddy, users, systemd service, Caddy config |
| `server/feature-conf.service` | The systemd service that runs `current.jar` |
| `server/Caddyfile` | Caddy's configuration (HTTPS port and name filled in by `setup.sh`) |
| `server/activate-release.sh` | Switches to an uploaded jar, checks it answers, goes back to the previous one if not |
| `../scripts/setup-server.sh` | Runs `server/setup.sh` on the server from your PC |
| `../scripts/deploy.sh` | Uploads a built jar and runs `activate-release.sh`, then checks the site answers from outside |
| `../.github/workflows/deploy.yml` | GitHub Actions: after every merge to `main`, build, both test suites, then `deploy.sh` |
| `known_hosts` | The server's SSH host key, so a deployment never talks to another machine at that address |

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

## Setting up the server (once, and after changing a file in `server/`)

```bash
bash scripts/setup-server.sh
```

It logs in as root with `~/.ssh/scaleway_feature_conf` and is safe to run again. Settings are environment variables
listed at the top of the script (`SITE_NAME`, `HTTPS_PORT`, ...).

The first run creates the password for the site. Read it with:

```bash
ssh -i ~/.ssh/scaleway_feature_conf root@51.15.205.198 cat /root/feature-conf-ui-password.txt
```

For a new password, delete `/etc/caddy/feature-conf-users` on the server and run the setup again.

## Users on the server

| User | Can |
|---|---|
| `root` | Everything. Log in with `~/.ssh/scaleway_feature_conf` (or your MobaXterm key). |
| `deploy` | Upload jars to `~/upload` and run `sudo /opt/feature-conf/bin/activate-release.sh <release>`, nothing else as root. Logs in with the deploy key only. Can read the service's log. |
| `feature-conf` | Runs the service. Can't log in. |

## On the server

```bash
systemctl status feature-conf                     # running?
journalctl -u feature-conf -o cat -f              # its output as it happens
journalctl -u feature-conf -o cat | grep '^{' | jq 'select(.evidence.requestId=="<id>") | .evidence'
ls -lt /opt/feature-conf/releases                 # the kept releases; current.jar points to one of them
journalctl -u caddy -n 50                         # HTTPS certificate problems show up here
```

Going back to an older release by hand: point `current.jar` at it and restart.

```bash
ln -sfn /opt/feature-conf/releases/<release>.jar /opt/feature-conf/current.jar && systemctl restart feature-conf
```
