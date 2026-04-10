#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MotionKit render worker — deploy from laptop to Hetzner box.
#
# Usage:
#   ./render-worker/deploy/deploy.sh <user@box-ip>
#   ./render-worker/deploy/deploy.sh root@5.75.123.45
#
# What it does:
#   1. rsync's the worker source + the Next.js app's presets + Remotion entry
#      + root package.json + pnpm-workspace.yaml up to /opt/motionkit.
#   2. Runs `pnpm install --prod --filter render-worker...` on the box.
#   3. Copies systemd unit + Caddyfile into place.
#   4. Restarts the service and reloads Caddy.
#
# Prereqs (run once): ./render-worker/deploy/bootstrap.sh on the box.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [[ $# -lt 1 ]]; then
	echo "Usage: $0 <user@host>" >&2
	exit 1
fi

REMOTE="$1"
REMOTE_ROOT="/opt/motionkit"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

log() { printf "\033[1;32m[deploy]\033[0m %s\n" "$*"; }

cd "$REPO_ROOT"

log "rsync'ing worker + app/src/remotion + presets + workspace files..."
rsync -az --delete \
	--exclude='node_modules' \
	--exclude='.next' \
	--exclude='.open-next' \
	--exclude='dist' \
	--exclude='output' \
	--exclude='.env' \
	./render-worker/ "$REMOTE:$REMOTE_ROOT/render-worker/"

# We need the app's Remotion source so the worker can bundle it.
rsync -az --delete \
	--exclude='node_modules' \
	./app/src/remotion/ "$REMOTE:$REMOTE_ROOT/app/src/remotion/"

rsync -az \
	./app/src/lib/types.ts "$REMOTE:$REMOTE_ROOT/app/src/lib/types.ts"

# Workspace metadata for pnpm install on the remote.
rsync -az \
	./package.json ./pnpm-workspace.yaml ./pnpm-lock.yaml ./.npmrc \
	"$REMOTE:$REMOTE_ROOT/"

# App package.json so pnpm knows the workspace structure (we don't install it).
rsync -az \
	./app/package.json "$REMOTE:$REMOTE_ROOT/app/package.json"

log "installing worker deps on remote..."
ssh "$REMOTE" "cd $REMOTE_ROOT && pnpm install --filter render-worker... --config.confirmModulesPurge=false"

log "installing systemd unit + Caddyfile..."
ssh "$REMOTE" bash -s <<'REMOTE_SCRIPT'
set -euo pipefail
install -m 644 /opt/motionkit/render-worker/deploy/motionkit-render.service /etc/systemd/system/motionkit-render.service
install -m 644 /opt/motionkit/render-worker/deploy/Caddyfile /etc/caddy/Caddyfile
chown -R motionkit:motionkit /opt/motionkit
systemctl daemon-reload
if systemctl is-enabled motionkit-render >/dev/null 2>&1; then
	systemctl restart motionkit-render
else
	echo "NOTE: motionkit-render not yet enabled. Set .env then run: systemctl enable --now motionkit-render"
fi
systemctl reload caddy || systemctl restart caddy
REMOTE_SCRIPT

log "deploy complete."
log "Reminder: ensure /opt/motionkit/render-worker/.env exists on the box with real values."
log "Check health: ssh $REMOTE 'curl -s http://127.0.0.1:4000/health'"
