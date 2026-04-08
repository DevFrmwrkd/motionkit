# Plan 03 -- Infrastructure, Deployment & Credentials

> Cloudflare Pages + R2 + Convex + Modal + GitHub

---

## 1. Environment & Credentials Map

### Available Credentials (from existing projects)

| Key | Value/Source | Project Source | Usage in MotionKit |
|-----|-------------|----------------|-------------------|
| `GOOGLE_API_KEY` | `AIzaSyACFbBvs8ksoA2jL8KxMJsw_NkqSRsf22k` | ai-image-outreach | Gemini AI (prompt-to-motion, Phase 4+) |
| `GITHUB_TOKEN` | `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` | ai-image-outreach | Repo management, CI/CD |
| `R2_ACCOUNT_ID` | (placeholder in source) | ai-image-outreach | Cloudflare R2 -- **needs real value** |
| `R2_ACCESS_KEY_ID` | (placeholder in source) | ai-image-outreach | Cloudflare R2 -- **needs real value** |
| `R2_SECRET_ACCESS_KEY` | (placeholder in source) | ai-image-outreach | Cloudflare R2 -- **needs real value** |

### New Credentials to Create

| Key | Where to Get | Purpose |
|-----|-------------|---------|
| `CONVEX_DEPLOYMENT` | `npx convex init` (auto-generated) | New Convex project for MotionKit |
| `CONVEX_URL` | Auto-generated with deployment | Convex cloud URL |
| `R2_BUCKET_NAME` | Cloudflare dashboard -> R2 | Create `motionkit-assets` bucket |
| `R2_PUBLIC_URL` | Cloudflare R2 custom domain | Public CDN URL for bundles |
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` | AES-256 key for API key encryption |
| `MODAL_API_KEY` | User-provided (BYOK) | Stored per-user, encrypted |

### `.env.local` Template

```env
# ── Convex ─────────────────────────────────────
CONVEX_DEPLOYMENT=dev:xxx-xxx-000       # Created by npx convex init
NEXT_PUBLIC_CONVEX_URL=https://xxx-xxx-000.convex.cloud

# ── Cloudflare R2 ──────────────────────────────
R2_ACCOUNT_ID=                          # From CF dashboard
R2_ACCESS_KEY_ID=                       # From CF R2 API tokens
R2_SECRET_ACCESS_KEY=                   # From CF R2 API tokens
R2_BUCKET_NAME=motionkit-assets
R2_PUBLIC_URL=                          # Custom domain or r2.dev URL

# ── Encryption ─────────────────────────────────
ENCRYPTION_KEY=                         # openssl rand -hex 32

# ── Google AI (Phase 4+) ──────────────────────
GOOGLE_API_KEY=AIzaSyACFbBvs8ksoA2jL8KxMJsw_NkqSRsf22k

# ── GitHub ─────────────────────────────────────
GITHUB_TOKEN=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
```

---

## 2. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Repository                     │
│                  DevFrmwrkd/motionkit                    │
└────────────┬─────────────────────────────┬──────────────┘
             │                             │
    push to main                   push to main
             │                             │
   ┌─────────▼──────────┐    ┌─────────────▼─────────────┐
   │  Cloudflare Pages  │    │     Convex Deploy         │
   │  (Auto-deploy)     │    │     (npx convex deploy)   │
   │                    │    │                             │
   │  Next.js SSG/SSR   │    │  Schema + Functions +      │
   │  Static assets     │    │  Actions + Cron jobs       │
   └────────────────────┘    └───────────────────────────-┘
```

### Cloudflare Pages Setup

```bash
# Connect GitHub repo to Cloudflare Pages
# Build command: cd app && pnpm build
# Output directory: app/.next
# Environment variables: set in CF dashboard

# OR use wrangler CLI:
npx wrangler pages project create motionkit
npx wrangler pages deploy app/.next --project-name motionkit
```

### Convex Deployment

```bash
# Development
npx convex dev                    # Starts dev server, hot-reloads

# Production
npx convex deploy                 # Deploys to production
```

---

## 3. Cloudflare R2 Setup

### Create Bucket

```bash
# Via wrangler CLI
npx wrangler r2 bucket create motionkit-assets

# Enable public access (for bundles, thumbnails, previews)
# Configure via Cloudflare dashboard: R2 -> motionkit-assets -> Settings
```

### CORS Configuration

```json
[
  {
    "AllowedOrigins": [
      "https://motionkit.pages.dev",
      "https://motionkit.frmwrkd.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

### Lifecycle Rules

```json
{
  "Rules": [
    {
      "ID": "expire-renders",
      "Filter": { "Prefix": "renders/" },
      "Status": "Enabled",
      "Expiration": { "Days": 7 }
    }
  ]
}
```

### R2 API Token

Create in Cloudflare dashboard: R2 -> Manage R2 API Tokens
- Permissions: Object Read & Write
- Scope: `motionkit-assets` bucket only

---

## 4. GitHub Repository Setup

```bash
# Initialize repo
cd "/Volumes/SSD/New Coding Projects/Remotion Marketplace"
git init
git remote add origin https://github.com/DevFrmwrkd/motionkit.git

# Branch strategy
# main        -> production (auto-deploys to CF Pages + Convex)
# develop     -> staging
# feature/*   -> feature branches
```

### `.gitignore`

```gitignore
node_modules/
.next/
.env.local
.env*.local
convex/_generated/
dist/
*.mp4
*.webm
.DS_Store
.turbo
```

---

## 5. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-convex:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install
      - run: npx convex deploy
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

  # Cloudflare Pages auto-deploys via GitHub integration (no action needed)
```

---

## 6. Monorepo Structure

```json
// package.json (root)
{
  "name": "motionkit",
  "private": true,
  "workspaces": ["app", "presets/*"],
  "scripts": {
    "dev": "concurrently \"cd app && pnpm dev\" \"npx convex dev\"",
    "build": "cd app && pnpm build",
    "deploy": "npx convex deploy && cd app && pnpm build",
    "preset:build": "tsx scripts/build-preset.ts",
    "preset:upload": "tsx scripts/upload-preset.ts",
    "seed": "tsx scripts/seed-presets.ts"
  }
}
```

---

## 7. Development Workflow

```
Terminal 1: pnpm dev          # Next.js dev server (localhost:3000)
Terminal 2: npx convex dev    # Convex dev server (auto-sync)

# Or combined:
pnpm dev                      # Runs both via concurrently
```

### Preset Development Workflow

```bash
# 1. Create preset from template
cp -r presets/_template presets/my-new-preset

# 2. Edit component + schema
code presets/my-new-preset/index.tsx

# 3. Preview locally with Remotion
npx remotion preview --entry remotion/index.ts

# 4. Bundle for upload
pnpm preset:build my-new-preset

# 5. Upload to R2
pnpm preset:upload my-new-preset

# 6. Register in Convex (auto by upload script)
```

---

## 8. Security Checklist

- [ ] `.env.local` in `.gitignore`
- [ ] R2 API token scoped to single bucket
- [ ] CORS restricted to app domains
- [ ] CSP headers set on Cloudflare Pages
- [ ] User API keys encrypted with AES-256-GCM
- [ ] Convex auth on all mutations
- [ ] Preset bundles validated on upload
- [ ] Rate limiting on render job creation
- [ ] R2 renders auto-expire after 7 days

---

## 9. Cost Estimates (Phase 1-3)

| Service | Free Tier | Expected Cost |
|---------|-----------|---------------|
| Cloudflare Pages | Unlimited sites, 500 builds/mo | $0 |
| Cloudflare R2 | 10GB storage, 10M reads/mo | $0 (early stage) |
| Convex | 1M function calls, 1GB storage | $0 (free tier) |
| Modal (BYOK) | $30/mo free tier per user | $0 (user pays) |
| Remotion License | Required for cloud rendering | ~$100-500/yr |
| GitHub | Free for private repos | $0 |
| **Total platform cost** | | **~$0-500/yr** |
