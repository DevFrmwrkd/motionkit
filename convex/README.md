# MotionKit Convex Backend

This directory contains the schema, queries, mutations, internal functions, and actions that power MotionKit.

## Current Tables

- `presets`
- `users`
- `collections`
- `savedPresets`
- `renderJobs`
- `projects`
- `aiGenerations`
- `votes`
- Convex auth tables from `@convex-dev/auth`

## Current Responsibilities

- Marketplace preset listing, search, cloning, and voting
- User profile management and per-user API key storage
- Demo-user creation for local exploration
- AI generation tracking for Gemini and Claude flows
- Saved variants, collections, and project organization
- Render job lifecycle tracking
- Mock render dispatch via `actions/renderWithModal.ts`

## Commands

```bash
npx convex dev
npx convex deploy
```

## Important Files

- [`schema.ts`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/convex/schema.ts)
- [`presets.ts`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/convex/presets.ts)
- [`users.ts`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/convex/users.ts)
- [`aiGeneration.ts`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/convex/aiGeneration.ts)
- [`actions/generatePreset.ts`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/convex/actions/generatePreset.ts)
- [`actions/renderWithModal.ts`](/Volumes/SSD/New Coding Projects/Remotion Marketplace/convex/actions/renderWithModal.ts)

## Notes

- `renderWithModal` is currently a mocked pipeline that simulates progress updates and returns a placeholder output URL.
- User API keys are stored in Convex, but the encryption path is still planned rather than fully wired.
- Literal credentials should never be stored in checked-in docs or seed data.
