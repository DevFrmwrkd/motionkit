# MotionKit — Design & Remix Spec

This is the design brief for the P0 UX rework. It is intentionally short: the point is to give you **direction and acceptance criteria**, not pixel specs. You own the pixels.

North star: **https://neuform.ai/**

## Before you touch any code

Spend a focused 45 minutes on Neuform. Open a Scratch note in Obsidian or a local markdown file and write down answers to these questions — this becomes your design brief, and I want to see it in the PR description of your first UX PR.

1. **Browsing** — How does the grid feel? What's on each card? What does hover do? How do they handle missing thumbnails? What's the rhythm between dense information and whitespace?
2. **Open → Customize → Save** — Walk through the full flow on one asset. What's immediate vs deferred? How many clicks before you see something react to your input? Where does the "save to my stuff" moment happen?
3. **Remix / Fork** — Can you take someone else's asset and make it yours? What does that action look like? Is it a button, a menu, an automatic state? Does the UI tell you you're now remixing?
4. **My stuff vs everyone's stuff** — How is the user's own content separated from the marketplace? Tabs? Sidebar? Separate route? How do folders work?
5. **Creator profiles** — Click on a creator. What's on their page? Avatar, bio, stats, portfolio, follow button, social links? How does it feel to scroll through their work?
6. **Design language** — Color palette, type scale, card elevation, hover states, motion. What's the one thing they do that makes it feel "expensive" instead of "scaffolded"?
7. **The one thing we should steal first** — If you could only port one idea over, what is it and why?

Dump that as `docs/neuform-study.md` in the repo. Reference it in your PRs. It's how I'll know you actually looked.

---

## The three things we are rebuilding

### 1. Marketplace vs. My Creations — structural clarity

Right now MotionKit blurs "stuff I made" with "stuff I browsed" with "stuff I forked." We want a model where every preset the user sees has an obvious answer to "whose is this and how did I get it?"

**Structural goal.** Two top-level contexts with distinct navigation:
- **Marketplace** — everyone's public presets. Browsing, discovery, filters, creator attribution.
- **My Library** — everything that belongs to me, sub-divided:
  - Originals (I created from scratch)
  - Forks (I cloned from the marketplace — show the parent link)
  - Saved Variants (customizations of someone else's preset where the code is theirs but the inputs are mine)
  - Collections (user-created folders that can hold any of the above)

**Visual goal.** Every preset card, wherever it appears, carries a badge that tells you its origin at a glance. No more guessing.

**Acceptance is in the punchlist** (`IMPROVEMENT-PUNCHLIST.md` → P0-1). This doc is the "why."

---

### 2. Remixing as a primary action

Today: `ForkButton` is a tiny outline button hidden in the workstation header, only visible after you've already opened a preset.

Target: "Remix" should feel like the native verb of the app. On Neuform you don't think of it as a feature, you think of it as the default thing you do. Copy that.

**Design intent.**
- Every marketplace card has a visible clone CTA (hover or persistent — your judgment).
- Clicking it fires immediately. No confirmation dialog. It's cheap, the whole point is low friction.
- On success: toast with "Open Fork →" as a one-click next step.
- In the workstation, when you're editing a fork, a subtle banner at the top tells you so ("Remixing @creator's preset — view original") so you're never confused about whose state you're mutating.
- The fork graph (`getVersionTree`) eventually becomes a visual element — a small branch diagram on the preset detail page — but that's P1, not blocking.

**Acceptance** → punchlist P0-2.

---

### 3. Public creator profiles

Today: `getPublicProfile` query exists in `convex/users.ts`. Nothing renders it. Author names on cards are plain text. There is no way to click a creator and see their work.

Target: `/creators/[userId]` renders a proper creator page. Every author mention in the UI is a link to it. Settings shows a live preview of your own profile as others see it, with a toggle for `isPublicProfile`.

**Design intent.**
- Top section: avatar, display name, bio, social links, aggregate stats (total downloads, total votes, presets published).
- Below: tabs or filter for Presets / Collections / (future: Followers).
- Grid of their published presets using the same `PresetCard` we ship elsewhere — do not build a second card component.
- Profile should feel like a portfolio, not a settings dump. It's the creator's shop window.
- Study Figma Community and Dribbble profiles as secondary references if Neuform's creator pages are thin.

**Acceptance** → punchlist P0-3.

---

## Design system ground rules

You already have Shadcn/UI + Tailwind + a dark palette (zinc-950 background, zinc-100 text, amber-500 primary accent, violet-500 brand accent). Do not install a new design system. Do not introduce a third accent color without asking.

- **Use the accents with intent.** Amber for primary action and active state. Violet for brand / premium / special moments. Never decorative.
- **Card elevation is a scale.** Pick three levels (flat / raised / floating) and use them consistently across all pages.
- **Hover states should feel tactile.** Gradient shift + shadow lift, not just a background color flip.
- **Missing thumbnails must not look like placeholders.** Category-specific gradients with a subtle geometric overlay beat "INTRO" centered in Helvetica every time.
- **Every primary view needs a loading state, an empty state, and an error state.** If you skip any of these, it counts as unfinished.

## What I don't want

- New dependencies without a conversation first.
- A rewrite of the component library. We iterate on what's there.
- Pixel-perfect Neuform clones. Steal the ideas, not the CSS.
- A fourth color in the palette.
- Dead code left behind "in case we need it." Delete it.
- Feature flags. Just change the code.

## How to ship this

Work the punchlist in order. P0-1 → P0-2 → P0-3 → P0-4 → P1-5 → P1-6 → P1-7 → P1-8 → P2-9. One task per PR. Draft PR early, screenshots mandatory for anything visual. Link the ClickUp task in the PR description.

First thing I want to see is `docs/neuform-study.md`. Everything else follows from there.

— Theo
