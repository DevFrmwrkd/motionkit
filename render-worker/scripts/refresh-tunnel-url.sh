#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MotionKit render worker — reconcile current tunnel URL with .env + Convex.
#
# cloudflared is running as a LaunchAgent (dev.motionkit.cloudflared). Its
# quick tunnel URL changes every time the process restarts (crash, reboot,
# logout). This script:
#   1. Reads the latest URL from the cloudflared log.
#   2. Rewrites PUBLIC_URL in render-worker/.env.
#   3. Sets RENDER_WORKER_URL in Convex dev + prod.
#   4. Kickstarts the render worker so it picks up the new PUBLIC_URL.
#
# Usage:
#   ./render-worker/scripts/refresh-tunnel-url.sh
#
# Run this after a reboot, after manually restarting cloudflared, or whenever
# /health stops responding through the public hostname.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$HOME/Library/Logs/motionkit-render"
CLOUDFLARED_ERR="$LOG_DIR/cloudflared.err.log"
CLOUDFLARED_OUT="$LOG_DIR/cloudflared.log"
ENV_FILE="$REPO_ROOT/render-worker/.env"

log() { printf "\033[1;36m[tunnel]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[tunnel]\033[0m %s\n" "$*" >&2; }

# cloudflared writes its tunnel info to stderr, which LaunchAgents route to
# cloudflared.err.log. The .log file is only used by legacy / manual runs.
URL=$(
  grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CLOUDFLARED_ERR" 2>/dev/null \
    | tail -1
)

if [[ -z "$URL" ]]; then
  err "no trycloudflare URL found in logs. Is cloudflared running?"
  err "  launchctl list | grep motionkit"
  err "  launchctl kickstart -k gui/\$(id -u)/dev.motionkit.cloudflared"
  exit 1
fi

log "current tunnel URL: $URL"

# Sanity check that it actually responds.
if ! curl -sf -m 10 "$URL/health" >/dev/null; then
  err "tunnel URL did not respond to /health within 10s."
  err "The URL may be stale. Trying to force cloudflared to re-publish..."
  launchctl kickstart -k "gui/$(id -u)/dev.motionkit.cloudflared"
  # Wait up to 30s for cloudflared to publish its new quick tunnel URL.
  NEW_URL=""
  for _ in $(seq 1 60); do
    NEW_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CLOUDFLARED_ERR" 2>/dev/null | tail -1)
    if [[ -n "$NEW_URL" && "$NEW_URL" != "$URL" ]]; then break; fi
    sleep 0.5
  done
  URL="$NEW_URL"
  log "new tunnel URL: $URL"
fi

# Update .env PUBLIC_URL
if [[ -f "$ENV_FILE" ]]; then
  tmp="$ENV_FILE.tmp.$$"
  awk -v url="$URL/renders" '
    /^PUBLIC_URL=/ { print "PUBLIC_URL=" url; found=1; next }
    { print }
    END { if (!found) print "PUBLIC_URL=" url }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
  log "updated $ENV_FILE → PUBLIC_URL=$URL/renders"
else
  err "missing $ENV_FILE"
  exit 1
fi

echo "$URL" > "$LOG_DIR/tunnel-url.txt"

# Push to Convex (both deployments so dev + prod stay in sync)
log "setting RENDER_WORKER_URL in Convex prod..."
(cd "$REPO_ROOT" && npx convex env set RENDER_WORKER_URL "$URL" --prod >/dev/null)
log "setting RENDER_WORKER_URL in Convex dev..."
(cd "$REPO_ROOT" && npx convex env set RENDER_WORKER_URL "$URL" >/dev/null)

# Restart the worker so it picks up the new PUBLIC_URL
log "restarting render worker..."
launchctl kickstart -k "gui/$(id -u)/dev.motionkit.render-worker"
sleep 3

# Final verification
if curl -sf -m 10 "$URL/health" >/dev/null; then
  log "done. $URL/health is live."
else
  err "health check failed after restart. Check logs:"
  err "  tail -f $LOG_DIR/worker.log"
  exit 1
fi
