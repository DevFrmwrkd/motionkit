# Plan 03 -- Infrastructure, Deployment & Credentials

> Planning document. Use `README.md`, `.env.example`, and `docs/CONTENT-MAP.md` for the current safe source of truth.

Cloudflare Pages + Convex + optional R2 + optional Modal is still the intended deployment direction, but this repo should never contain literal secrets.

---

## 1. Safe Environment Surface

Required now:

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`

Optional now:

- `GOOGLE_API_KEY`
- `ANTHROPIC_API_KEY`

Planned / partially wired:

- `ENCRYPTION_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

Safe example:

```env
CONVEX_DEPLOYMENT=dev:your-deployment-id
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-id.convex.cloud

GOOGLE_API_KEY=
ANTHROPIC_API_KEY=

ENCRYPTION_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=motionkit-assets
R2_PUBLIC_URL=
```

---

## 2. Security Rules

- Never commit literal API keys, tokens, or provider secrets to docs.
- Keep credentials in local `.env.local`, Convex environment settings, or hosting dashboards.
- Treat all example values in this repo as placeholders only.

---

## 3. Current Deployment Notes

- Frontend package: `app/`
- Backend package: `convex/`
- Local development: `pnpm dev`
- Convex only: `npx convex dev`
- Production backend deploy: `npx convex deploy`

The current frontend build is self-contained and does not require downloading Google Fonts.

---

## 4. Current Infrastructure Gaps

- `convex/actions/renderWithModal.ts` is still a mocked render flow.
- R2 upload/preset packaging is planned but not fully wired.
- Encryption support is planned for stored provider keys.

---

## 5. Recommended Next Steps

1. Keep `.env.example` aligned with the code and treat it as the only public template.
2. Add any real secrets only in local env files or deployment dashboards.
3. Finish the real Modal render action and R2 upload flow before documenting production deployment as complete.
