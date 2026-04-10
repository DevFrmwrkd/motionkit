# MotionKit Render Worker

Self-hosted Remotion render service for MotionKit. Runs on a Hetzner CX33 (or any Ubuntu 22.04/24.04 box) behind Caddy with automatic HTTPS. Convex actions call it over HTTPS with an HMAC-signed request; the worker bundles presets with Remotion, renders MP4s to disk, and Caddy serves them back.

```
┌───────────┐   HMAC POST    ┌──────────────┐   renderMedia   ┌────────────┐
│  Convex   │ ─────────────▶ │   Fastify    │ ──────────────▶ │  Chromium  │
│  action   │                │   worker     │                 │ (headless) │
└───────────┘                │  (p-queue)   │                 └────────────┘
      ▲                      └──────┬───────┘                        │
      │                             │                                ▼
      │  outputUrl                  │                         /var/www/renders/*.mp4
      │                             ▼                                │
      │                      ┌──────────────┐                        │
      └────────────────────  │    Caddy     │ ◀──────────────────────┘
                    GET /renders/*.mp4
```

## Architecture

- **Fastify 5** HTTP server with HMAC-SHA256 request auth (`x-worker-signature: sha256=<hex>`).
- **p-queue** concurrency limiter (default `MAX_CONCURRENCY=2`; fine for 4-vCPU CX33 since each render pins cores).
- **Remotion bundler** runs once at boot (`getBundle()` singleton) so renders skip the webpack step.
- **Caddy** terminates TLS, proxies `/render` + `/health` to the Node process, and serves finished MP4s directly from `/var/www/renders` with immutable caching.
- **systemd** supervises the Node process (`motionkit-render.service`), with memory limits (`MemoryHigh=5G`, `MemoryMax=6G`) leaving headroom on an 8 GB box.

## Prerequisites (one-time, from you)

1. **A Hetzner CX33 box** (or any 4 vCPU / 8 GB Ubuntu 22.04/24.04). Root SSH access.
2. **A subdomain** pointing at the box's public IP (e.g. `render.motionkit.dev`). A single A record is enough — Caddy will auto-provision a Let's Encrypt cert.
3. **A worker secret**: `openssl rand -hex 32` — keep this; you'll set it in two places (worker `.env` on the box, and Convex env).

## Deploy flow

### 1. Bootstrap the box (one time, ~3 min)

From your laptop:

```bash
ssh root@<box-ip> 'bash -s' < render-worker/deploy/bootstrap.sh
```

This installs Node 20, pnpm, Chromium, Caddy, creates the `motionkit` user, `/opt/motionkit`, `/var/www/renders`, and configures UFW (22/80/443 only).

### 2. Push the code from your laptop

```bash
./render-worker/deploy/deploy.sh root@<box-ip>
```

This rsyncs:
- `render-worker/` (the worker source)
- `app/src/remotion/` (composition registry + preset sources)
- `app/src/lib/types.ts` (preset type contract)
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`
- `app/package.json` (workspace metadata only — not installed)

Then it runs `pnpm install --filter render-worker...` on the box, installs the systemd unit + Caddyfile, and restarts the service.

### 3. Configure the worker env (one time, on the box)

```bash
ssh root@<box-ip>
sudo -u motionkit tee /opt/motionkit/render-worker/.env >/dev/null <<'EOF'
PORT=4000
HOST=127.0.0.1
MAX_CONCURRENCY=2
RENDER_WORKER_SECRET=<the-hex-secret-you-generated>
OUTPUT_DIR=/var/www/renders
PUBLIC_URL=https://render.motionkit.dev
REMOTION_ENTRY=/opt/motionkit/app/src/remotion/index.ts
CHROMIUM_PATH=/usr/bin/chromium-browser
EOF

# Edit the Caddyfile host if you're not using render.motionkit.dev
sudoedit /etc/caddy/Caddyfile
systemctl reload caddy

# Enable + start the worker
systemctl enable --now motionkit-render
systemctl status motionkit-render
```

### 4. Wire Convex to the worker

Set the two prod env vars so `convex/actions/renderWithWorker.ts` can reach the box:

```bash
npx convex env set RENDER_WORKER_URL https://render.motionkit.dev --prod
npx convex env set RENDER_WORKER_SECRET <same-hex-secret> --prod
```

(Same for `--dev` if you want to test against the dev deployment.)

### 5. Verify

```bash
# From your laptop
curl https://render.motionkit.dev/health
# → {"ok":true,"queue":{"size":0,"pending":0,"concurrency":2}}

# Kick a render from the app:
# open https://motionkit.frmwrkd-media.workers.dev/workstation
# Pick a preset → click Render. Watch the job in /dashboard/history.
```

## Subsequent deploys

Just:

```bash
./render-worker/deploy/deploy.sh root@<box-ip>
```

It re-runs `pnpm install`, reinstalls the unit + Caddyfile (idempotent), and `systemctl restart motionkit-render`. The Remotion bundle is rebuilt on the first render after restart (~5-10s), then cached in memory for the life of the process.

## How concurrency works

- `MAX_CONCURRENCY` controls how many `renderMedia()` calls run in parallel.
- Each render pins 1–2 cores hard (Chromium + Remotion's worker pool). On a 4-vCPU CX33, `2` is a sane default; crank to `3` if you want more throughput and can tolerate occasional queueing.
- Jobs past the concurrency limit queue inside the worker — the HTTP request simply blocks until its turn. Convex actions have a generous timeout, so this is fine for normal usage. If queues get long, bump the box or the concurrency.
- `/health` reports `{ size, pending, concurrency }` live — hook this into whatever monitoring you like.

## Troubleshooting

**Worker won't start:**
```bash
journalctl -u motionkit-render -n 100 --no-pager
tail -f /var/log/motionkit-render.log
```

**Chromium missing fonts / boxy glyphs:** `bootstrap.sh` installs `fonts-liberation`, `fonts-noto-color-emoji`, and `fonts-noto-cjk` — if you need others, `apt-get install fonts-<whatever>` and restart the worker.

**Out of memory:** Lower `MAX_CONCURRENCY` to 1, or upgrade to CX43 (16 GB). The systemd unit caps the process at 6 GB.

**Renders succeed but URLs 404:** Check that Caddy can read `/var/www/renders` — it should be owned by `motionkit:motionkit` (bootstrap does this). `ls -la /var/www/renders`.

**HMAC 401s:** The secret on the box and in Convex env vars must match exactly. Re-set both sides if in doubt.

**Bundle fails at startup with "Can't resolve @/lib/types":** Deploy didn't rsync `app/src/lib/types.ts` or `app/src/remotion/`. Re-run `deploy.sh`.

**"Port 4000 already in use":** Old process didn't exit. `systemctl stop motionkit-render && pkill -f 'tsx src/server.ts' ; systemctl start motionkit-render`.

## Files

```
render-worker/
├── src/
│   ├── config.ts        # env loading
│   ├── renderer.ts      # Remotion bundle + renderMedia wrapper
│   ├── queue.ts         # p-queue concurrency limiter
│   └── server.ts        # Fastify + HMAC auth
├── deploy/
│   ├── bootstrap.sh     # one-shot box prep (Node, Chromium, Caddy, user, dirs)
│   ├── deploy.sh        # rsync + pnpm install + systemctl restart
│   ├── motionkit-render.service  # systemd unit
│   └── Caddyfile        # TLS + reverse proxy + static MP4 serving
├── package.json
└── README.md            # you are here
```
