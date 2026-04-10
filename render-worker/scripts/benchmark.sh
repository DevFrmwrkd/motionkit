#!/usr/bin/env bash
# Benchmark the render worker: local direct vs public tunnel.
# Usage: ./benchmark.sh [runs]
set -euo pipefail

RUNS="${1:-5}"
SECRET="$(grep '^RENDER_WORKER_SECRET=' "$(dirname "$0")/../.env" | cut -d= -f2)"
LOCAL="http://127.0.0.1:4000"
TUNNEL="$(cat ~/Library/Logs/motionkit-render/tunnel-url.txt 2>/dev/null || echo "")"
COMP="${COMP:-ClaudeGradientWave}"

if [[ -z "$SECRET" ]]; then
  echo "no RENDER_WORKER_SECRET in .env" >&2
  exit 1
fi
if [[ -z "$TUNNEL" ]]; then
  echo "no tunnel URL in ~/Library/Logs/motionkit-render/tunnel-url.txt" >&2
  exit 1
fi

hdr() { printf "\n\033[1m=== %s ===\033[0m\n" "$*"; }
row() { printf "%-8s %-32s %7s ms wall  %7s ms render  %5s KB\n" "$1" "$2" "$3" "$4" "$5"; }

bench() {
  local label="$1" base="$2"
  local total_wall=0 total_render=0
  for i in $(seq 1 "$RUNS"); do
    local body sig t0 t1 wall json render_ms bytes kb
    body=$(printf '{"jobId":"bench-%s-%s","compositionId":"%s","inputProps":{}}' "$label" "$i" "$COMP")
    sig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $NF}')
    t0=$(python3 -c 'import time; print(int(time.time()*1000))')
    json=$(curl -sS --max-time 180 \
      -H "content-type: application/json" \
      -H "x-worker-signature: sha256=$sig" \
      -X POST "$base/render" -d "$body")
    t1=$(python3 -c 'import time; print(int(time.time()*1000))')
    wall=$((t1 - t0))
    render_ms=$(printf '%s' "$json" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read()).get("durationMs",-1))')
    bytes=$(printf '%s' "$json" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read()).get("sizeBytes",0))')
    kb=$((bytes / 1024))
    row "$label" "run $i" "$wall" "$render_ms" "$kb"
    total_wall=$((total_wall + wall))
    total_render=$((total_render + render_ms))
  done
  printf "\033[1m%-8s avg wall: %6d ms   avg render: %6d ms   tunnel overhead: %5d ms\033[0m\n" \
    "$label" $((total_wall / RUNS)) $((total_render / RUNS)) $(( (total_wall - total_render) / RUNS ))
}

hdr "warmup (1 run, discarded)"
body='{"jobId":"warmup-discard","compositionId":"'"$COMP"'","inputProps":{}}'
sig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $NF}')
curl -sS -o /dev/null -H "content-type: application/json" \
  -H "x-worker-signature: sha256=$sig" \
  -X POST "$LOCAL/render" -d "$body"
echo "warmup done"

hdr "LOCAL (loopback, no tunnel)"
bench LOCAL "$LOCAL"

hdr "TUNNEL ($TUNNEL)"
bench TUNNEL "$TUNNEL"
