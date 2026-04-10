#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MotionKit render worker — one-shot bootstrap for a fresh Ubuntu 22.04/24.04
# Hetzner Cloud box.
#
# Run as root on the target machine:
#   ssh root@<box-ip> 'bash -s' < render-worker/deploy/bootstrap.sh
#
# What it does:
#   1. Installs Node 20, Chromium, Caddy, rsync, git, build tooling.
#   2. Creates a dedicated `motionkit` user + /opt/motionkit and /var/www/renders.
#   3. Installs the systemd unit (does NOT enable it — deploy.sh does that
#      after rsync has actually put code on the box).
#   4. Installs the Caddyfile and reloads Caddy.
#
# You still need to:
#   • Point a DNS A record at the box (e.g. render.motionkit.dev).
#   • Run deploy.sh from your laptop to rsync the worker code over.
#   • Set /opt/motionkit/render-worker/.env with real values.
#   • `systemctl enable --now motionkit-render`
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

log() { printf "\033[1;34m[bootstrap]\033[0m %s\n" "$*"; }

if [[ $EUID -ne 0 ]]; then
	echo "must be run as root" >&2
	exit 1
fi

log "updating apt and installing base packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y \
	curl ca-certificates gnupg lsb-release \
	build-essential python3 git rsync ufw \
	chromium-browser \
	fonts-liberation fonts-noto-color-emoji fonts-noto-cjk \
	libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
	libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 \
	libpango-1.0-0 libcairo2 libcups2 \
	|| apt-get install -y libasound2  # fallback for older releases

log "installing Node.js 20 (nodesource)..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -c2-3)" -lt 20 ]]; then
	curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
	apt-get install -y nodejs
fi
node --version
npm --version

log "installing pnpm globally..."
npm install -g pnpm@10

log "installing Caddy (official repo)..."
if ! command -v caddy >/dev/null 2>&1; then
	apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
		| gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
		> /etc/apt/sources.list.d/caddy-stable.list
	apt-get update -y
	apt-get install -y caddy
fi

log "creating motionkit user + dirs..."
id motionkit >/dev/null 2>&1 || useradd --system --create-home \
	--shell /usr/sbin/nologin --home-dir /opt/motionkit motionkit
mkdir -p /opt/motionkit/render-worker
mkdir -p /var/www/renders
mkdir -p /var/log/caddy
chown -R motionkit:motionkit /opt/motionkit /var/www/renders

log "configuring UFW (allow 22, 80, 443)..."
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

log "detecting chromium path..."
CHROMIUM_PATH="$(command -v chromium-browser || command -v chromium || true)"
if [[ -z "$CHROMIUM_PATH" ]]; then
	echo "WARN: chromium not found in PATH — renderer will download its own." >&2
fi
echo "Chromium: ${CHROMIUM_PATH:-(auto)}"

log "bootstrap complete. Next steps:"
cat <<EOF

  From your laptop:
    ./render-worker/deploy/deploy.sh <box-ip>

  On the box (once .env is set):
    systemctl daemon-reload
    systemctl enable --now motionkit-render
    systemctl reload caddy

  Then verify:
    curl https://<your-subdomain>/health
EOF
