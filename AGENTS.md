<!-- AGENTS.md — CoinDraft -->

# CoinDraft — Agent Guide

## Project Overview

CoinDraft is a wallet-first crypto fantasy game built in **SvelteKit + TypeScript**. Users connect an EVM or Solana wallet, draft a five-token lineup across crypto sectors (L1, L2, DeFi, Meme, Wildcard), and compete on real market data from the SoSoValue API. It was built for the SoSoValue Buildathon (see `README.md`, which is the product PRD).

The app has grown past its original Wave 1 scope (single head-to-head draft loop). Current feature set:

- **Play** — 1v1 contests (bot opponent or real matchmaking via a Postgres-backed queue), multiplayer lobbies (open-join or fixed-size auto-match, sizes 4/6/8), paper (practice) mode.
- **Compete** — Leagues (public/private with invite codes, win/loss/points standings), global XP leaderboard, badge/achievement system.
- **Learn** — The Gauntlet (daily market question seeded from live data, XP + 24h sector draft boost on correct answer), AI Mentor (streaming chat grounded in live sector/token/news data), Research Hub (reading a daily article earns XP + a sector boost).
- **Intelligence** — Sector Wars (sector performance), Whale Watch (IBIT ETF flow streak alerts), live token ticker.
- **Sharing** — Resolved contests get a public OG-preview page (`/share/[id]`) and a server-rendered SVG result card (`/api/contest/[id]/card`).

- **Language**: TypeScript (strict)
- **Package manager**: npm
- **Framework**: SvelteKit 2 + Svelte 5 (runes mode enforced), SSR disabled globally
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`), design tokens in `src/routes/layout.css`
- **Database**: Neon serverless Postgres via Drizzle ORM (`drizzle-orm/neon-http`)
- **Auth**: Reown AppKit (EVM via Wagmi + SIWE; Solana via ed25519 signatures)
- **AI**: Groq SDK — default model `openai/gpt-oss-120b`, optional 0G Compute Router backend behind a feature flag
- **Data**: SoSoValue API (server-side only, in-memory cached)
- **Deployment**: Vercel (`@sveltejs/adapter-vercel`) with two daily cron jobs

---

## Build and Development Commands

All commands run via npm:

| Command               | Purpose                                   |
| --------------------- | ----------------------------------------- |
| `npm run dev`         | Start the Vite dev server                 |
| `npm run build`       | Production build                          |
| `npm run preview`     | Preview the production build locally      |
| `npm run check`       | Svelte type-checking (`svelte-check`)     |
| `npm run check:watch` | Type-check in watch mode                  |
| `npm run lint`        | Prettier check + ESLint                   |
| `npm run format`      | Auto-format with Prettier                 |
| `npm run db:push`     | Push Drizzle schema to the database       |
| `npm run db:generate` | Generate Drizzle migration files          |
| `npm run db:migrate`  | Run pending Drizzle migrations            |
| `npm run db:studio`   | Open Drizzle Studio                       |

Note: `drizzle.config.ts` throws if `DATABASE_URL` is not set in the environment — all `db:*` commands need it.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/coindraft"

# SoSoValue API (server-side only)
SOSOVALUE_API_KEY=your_key_here
SOSOVALUE_BASE_URL=https://openapi.sosovalue.com/openapi/v1

# AI — default backend (Groq)
GROQ_API_KEY=your_key_here

# AI — optional 0G Compute Router backend for /api/mentor and /api/breakdown.
# Leave USE_0G_COMPUTE=false/unset to stay on Groq. Partial config falls back
# to Groq with a warning. See docs-project/0g-compute-integration-findings.md.
USE_0G_COMPUTE=false
ZG_COMPUTE_API_KEY=sk-your_0g_router_key_here
ZG_COMPUTE_BASE_URL=https://router-api-testnet.integratenetwork.work/v1
ZG_COMPUTE_MODEL=your_chosen_model_id_here

# Auth
SESSION_SECRET=your_random_32_char_secret_key_here

# Reown (public client key — exposed to browser)
PUBLIC_REOWN_PROJECT_ID=your_reown_project_id_here

# Vercel Cron auth — Vercel auto-sends this as a Bearer token to cron routes
CRON_SECRET=your_random_cron_secret_here
```

**Security rule**: `SOSOVALUE_API_KEY`, `GROQ_API_KEY`, and `ZG_COMPUTE_*` must never be used in client-side code. All third-party calls go through SvelteKit `+server.ts` API routes.

---

## Code Organization

```
src/
├── app.d.ts              # SvelteKit ambient types
├── app.html              # HTML shell
├── lib/
│   ├── appkit.ts         # Reown AppKit singleton (client-only, EVM + Solana)
│   ├── constants.ts      # Game sectors (l1, l2, defi, meme, wildcard)
│   ├── sectors.ts        # Heuristic symbol→sector classifier for news content
│   ├── sectorTheme.ts    # Sector → CSS-custom-property map (never hardcode hexes)
│   ├── badges.ts         # Client-safe badge catalog (code, name, emoji)
│   ├── toast.ts          # Toast store + helper
│   ├── tokenRegistry.ts  # Hardcoded Wave 1 draft pool (currency_ids never filled in — see Legacy)
│   ├── components/
│   │   ├── Nav.svelte    # Nav + wallet connect/sign flow
│   │   ├── Gauntlet.svelte
│   │   ├── Toast.svelte
│   │   └── ui/           # Bar, Pill, SectorBadge, StatBlock, Ticker
│   ├── assets/           # SVG logos, architecture/flow diagrams
│   └── server/           # Server-only code ($lib/server)
│       ├── auth.ts       # Session token create/parse + user lookups
│       ├── db.ts         # Drizzle + Neon client (neon-http, $env/static/private)
│       ├── schema.ts     # Drizzle schema (13 tables — see below)
│       ├── sosovalue.ts  # SoSoValue API client, in-memory cache, retry on 429
│       ├── scoring.ts    # Pick/lineup scoring + ETF streak detection
│       ├── contest-resolution.ts  # scoreLineupPicks + resolveContest (1v1)
│       ├── lobby-resolution.ts    # resolveLobby (multiplayer ranking + XP curve)
│       ├── matchmaking.ts         # 1v1 Postgres-backed queue (30s staleness)
│       ├── lobby-matchmaking.ts   # Fixed-size lobby queue (60s staleness)
│       ├── gauntlet.ts   # Daily question seeding (live-data templates + static fallback bank)
│       ├── badges.ts     # Server-side badge awarding (idempotent)
│       ├── sodex.ts      # SoDEX price shim — currently just wraps SoSoValue snapshot
│       ├── aiCompute.ts  # Shared AI client factory (Groq default, 0G Router when flagged)
│       └── resultCard.ts # 1200x630 SVG result card renderer (standalone, no CSS vars)
└── routes/
    ├── +layout.svelte    # Root layout: Nav, token ticker
    ├── +layout.server.ts # Session parse; guards /contest, /draft, /matchmaking
    ├── +layout.ts        # `export const ssr = false`
    ├── +page.svelte      # Landing page
    ├── layout.css        # Tailwind entrypoint + ALL design tokens (@theme)
    ├── api/              # See API Routes table below
    ├── dashboard/        # Contest entry + market context (Sector Wars, Whale Watch)
    ├── draft/            # Five-pick lineup builder
    ├── matchmaking/      # 1v1 queue UI
    ├── lobby/            # Lobby browser/create; lobby/[id]/result/ for results
    ├── contest/result/   # Resolved 1v1 contest view
    ├── leagues/          # League list + leagues/[id] standings
    ├── leaderboard/      # Global XP leaderboard
    ├── mentor/           # AI Mentor chat UI
    ├── research/         # Research Hub (news + daily read boost)
    ├── profile/          # User profile (XP, badges, boosts)
    ├── guide/, docs/     # Static how-to-play and docs pages
    ├── design/pickers/   # Design sandbox page
    ├── share/[id]/       # +server.ts — public OG-preview HTML (not a page; see below)
    └── manager/          # +page.server.ts only — 308 redirect to /dashboard
```

### Key module rules

- **Client code** lives in `src/lib/` (not inside `src/lib/server/`).
- **Server-only code** lives in `src/lib/server/`. SvelteKit blocks client imports from here.
- **API routes** are `+server.ts` files under `src/routes/api/`.
- **Pages** are `+page.svelte` files under `src/routes/`.
- `src/lib/badges.ts` is the client-safe badge catalog; `src/lib/server/badges.ts` does the awarding.

---

## Runtime Architecture

### SvelteKit

- Runes mode enforced for all non-`node_modules` files (`svelte.config.js`). Use `$state`, `$derived`, `$props` — never legacy `$:`.
- SSR is disabled globally (`src/routes/+layout.ts`) because the root layout pulls in wallet SDKs that break under Node SSR. The only server-rendered HTML anywhere is `src/routes/share/[id]/+server.ts`, which returns a hand-built HTML document so link-preview crawlers get real `og:` meta tags.
- Protected routes (`/contest`, `/draft`, `/matchmaking`) redirect unauthenticated users to `/?auth=required` from `+layout.server.ts`.

### Styling / design system

- Tailwind v4 via the Vite plugin; entry CSS is `src/routes/layout.css`.
- **Every color is defined once** as a CSS custom property in `layout.css` (`:root` raw palette → `@theme` semantic tokens). Never hardcode a hex in components; use tokens like `bg-bg`, `text-text`, `bg-primary`, sector colors via `src/lib/sectorTheme.ts`.
- The palette: ink `#1A2421`, page `#F5FAFA`, coral (brand) `#F78E79`, mint (positive/L1) `#68C2A8`, blue (L2) `#5FA8D8`, amber (DeFi) `#F7C978`, sky (Wildcard) `#81BBE3`. Meme intentionally shares brand coral.
- Fonts: Archivo (sans), JetBrains Mono.
- Exception: `src/lib/server/resultCard.ts` renders a standalone SVG and must duplicate hex values — keep it in sync with `layout.css` if the palette changes.
- Reduced-motion users get animations disabled via `prefers-reduced-motion` in `layout.css`.

### Database (Drizzle + Neon)

- Single canonical schema: `src/lib/server/schema.ts`. Single DB client: `src/lib/server/db.ts` (`drizzle-orm/neon-http`, `$env/static/private`).
- `drizzle.config.ts` points at that schema.
- Tables: `users`, `contests` (1v1), `lineups`, `lineup_picks`, `lobbies` (3+ player, parallel to contests — not a generalization of them), `lobby_participants`, `lobby_queue`, `leagues`, `league_members`, `gauntlet_questions`, `gauntlet_attempts`, `matchmaking_queue`, `user_badges`, `research_reads`.
- Conventions: camelCase TS fields → snake_case columns (`xpTotal` → `xp_total`); `numeric` columns are read/written as strings; `users.active_boosts` is jsonb `[{ sector, expiresAt }]`.
- A `lineups` row belongs to exactly one of `contestId` / `lobbyId`.
- Queues (`matchmaking_queue`, `lobby_queue`) are Postgres tables, not in-memory, so they survive serverless cold starts. Claiming uses select-then-delete with a lost-race check.

### Auth

- Wallet-first, wallet-only. There is no email/password path (legacy `/login`/`/signup` pages and routes have been removed).
- Flow: `GET /api/auth/nonce` sets a `siwe_nonce` cookie → wallet signs a message → `POST /api/auth/verify` verifies (EVM: `siwe`; Solana: `tweetnacl` + `bs58` ed25519) → upserts user → sets `session` cookie (httpOnly, sameSite strict, 7 days).
- Session tokens (`src/lib/server/auth.ts`) are `base64(payload).truncatedBase64(payload+SESSION_SECRET)` — a simple secret-suffix scheme, not a real HMAC.
- Most API routes authenticate by reading + parsing the `session` cookie themselves.

### SoSoValue integration (`src/lib/server/sosovalue.ts`)

- Base URL `https://openapi.sosovalue.com/openapi/v1`, auth header `x-soso-api-key`.
- In-memory `Map` cache, per-endpoint TTLs: `/currencies` 24h, `/currencies/sector-spotlight` 5min, `/etfs/summary-history` 5min, `/news/featured` 15min, `/currencies/{id}/market-snapshot` **5min** (deliberately raised from 60s — `getTokensWithPrices` fires up to 30 snapshot calls in parallel and a tight TTL caused real rate-limit hits).
- Retries up to 3x on HTTP 429 with the wait capped at 5s (SoSoValue's `retry_after` can otherwise hang a page load for minutes).
- `extractPrice()` defensively pulls a USD price out of whatever field the snapshot returns.
- `getTokensWithPrices(30)` merges `/currencies` with per-token snapshots and caches the merged list 5min.

### Scoring and resolution

- Pick score (`calcPickScore`): linear on % change, clamped to [-100%, +200%], mapped to `max(0, 50 + pct/2)`. So -50%→0pts, 0%→50pts, +100%→150pts. Lineup score = sum of 5 picks.
- `resolveContest` (`contest-resolution.ts`) and `resolveLobby` (`lobby-resolution.ts`) are idempotent and user-independent so both lazy-resolve-on-view and cron can call them.
- Resolution happens two ways: (1) lazily, when someone hits the result endpoint; (2) the daily cron sweep catches contests/lobbies whose `endAt` passed with no page view.
- XP: 1v1 winner 250, loser 60 (2x for weekly); lobby XP is a linear curve 250 (1st) → 60 (last). Paper contests award `paperXpTotal` only — no real XP, streak, badge, or league impact.
- Bot opponent: when a contest has no `userBId`, the bot score is synthesized from the user's score (`scoreA - 120 + random*220`).
- Resolution also updates win streaks, league standings (1v1 only — lobby resolution intentionally skips leagues), matchmaking status, and win/streak badges.

### AI (mentor + breakdown)

- Both `/api/mentor` and `/api/breakdown` use `getAiClient()` from `src/lib/server/aiCompute.ts`: Groq with model `openai/gpt-oss-120b` by default; if `USE_0G_COMPUTE=true` **and** all three `ZG_COMPUTE_*` vars are set, the same `groq-sdk` client is pointed at 0G's OpenAI-compatible Router via `baseURL` override.
- `/api/mentor` streams plain text; its system prompt is rebuilt per request from live `/api/sectors`, `/api/tokens`, `/api/news` data. History capped at 8 messages.
- `/api/breakdown` returns 2–3 sentences of post-match analysis; news fetch failure is non-fatal.
- `max_tokens` is 400 on both because gpt-oss is a reasoning model that spends part of the budget on its internal trace.

### Gauntlet, boosts, research

- `/api/gauntlet/seed` (cron, daily 00:00) ensures today's question exists; `/api/gauntlet/today` self-heals if the cron hasn't run. Questions are generated procedurally from live token/sector data (no LLM), falling back to a deterministic per-day pick from a static bank.
- A correct answer awards XP + a 24h `activeBoosts` entry for a sector. `/api/research/read` gives the same kind of boost once per day for reading an article (20 XP).

### Sharing

- `/share/[id]?u=<userId>` — public, unauthenticated HTML with OG/Twitter meta tags.
- `/api/contest/[id]/card?u=<userId>` — public SVG result card (1200x630), cached 1h.

---

## API Routes

| Route                         | Method   | Purpose                                                        |
| ----------------------------- | -------- | -------------------------------------------------------------- |
| `/api/auth/nonce`             | GET      | Issue SIWE nonce cookie                                        |
| `/api/auth/verify`            | POST     | Verify EVM/Solana signature, upsert user, set session          |
| `/api/auth/logout`            | POST     | Clear session cookie                                           |
| `/api/me`                     | GET      | Current user profile (XP, paper XP, streak, boosts)            |
| `/api/contests`               | GET/POST | List user's contests / create-or-reuse an active one (`mode: 'paper'` for practice) |
| `/api/contest/[id]/lineup`    | POST     | Submit 5-pick lineup; sets contest live when userA submits     |
| `/api/contest/[id]/result`    | GET      | Lazy-resolve + return 1v1 result, award badges                 |
| `/api/contest/[id]/card`      | GET      | Public SVG result card (OG image)                              |
| `/api/matchmaking/join`       | POST     | Join 1v1 queue; matches instantly if someone is waiting        |
| `/api/matchmaking/leave`      | POST     | Leave 1v1 queue                                                |
| `/api/matchmaking/status`     | GET      | Poll queue/match status                                        |
| `/api/lobby`                  | GET/POST | Browse open lobbies / create one (creator auto-joins)          |
| `/api/lobby/[id]/join`        | POST     | Join an open lobby                                             |
| `/api/lobby/[id]/start`       | POST     | Creator starts lobby → `drafting` (min 2 players)              |
| `/api/lobby/[id]/lineup`      | POST     | Submit lineup into a lobby                                     |
| `/api/lobby/[id]/result`      | GET      | Lazy-resolve + return lobby standings                          |
| `/api/lobby/queue/join`       | POST     | Fixed-size auto-match queue (sizes 4/6/8) → `fixed` lobby      |
| `/api/lobby/queue/leave`      | POST     | Leave lobby queue                                              |
| `/api/lobby/queue/status`     | GET      | Poll lobby queue status                                        |
| `/api/leagues`                | GET/POST | List public + my leagues / create (private gets invite code)   |
| `/api/leagues/[id]`           | GET      | League detail + standings                                      |
| `/api/leagues/join`           | POST     | Join by leagueId or inviteCode                                 |
| `/api/leaderboard`            | GET      | Top 50 users by XP                                             |
| `/api/badges`                 | GET      | Badge catalog with earned state for current user               |
| `/api/gauntlet/today`         | GET      | Today's question + user's attempt state (self-seeds)           |
| `/api/gauntlet/answer`        | POST     | Answer once per question; XP + sector boost if correct         |
| `/api/gauntlet/seed`          | GET/POST | Cron: seed today's question (Bearer `CRON_SECRET`)             |
| `/api/research/read`          | POST     | Claim daily research boost (20 XP + sector boost)              |
| `/api/mentor`                 | POST     | Streaming AI mentor chat (auth required)                       |
| `/api/breakdown`              | POST     | AI post-match analysis (auth required)                         |
| `/api/tokens`                 | GET      | Top 30 tokens with live prices                                 |
| `/api/sectors`                | GET      | Sector performance mapped to the 5 game sectors                |
| `/api/etf`                    | GET      | IBIT ETF flow history + inflow/outflow streak alerts           |
| `/api/news`                   | GET      | Featured news headlines                                        |
| `/api/snapshot/[id]`          | GET      | Market snapshot for a currency                                 |
| `/api/sodex`                  | GET      | `?currencyId=` price via the SoDEX shim (currently SoSoValue)  |
| `/api/cron/resolve-all`       | GET/POST | Cron: sweep due contests **and** lobbies (Bearer `CRON_SECRET`)|
| `/api/cron/resolve-contests`  | GET/POST | Older single-purpose sweep; superseded by `resolve-all`        |
| `/api/cron/resolve-lobbies`   | GET/POST | Older single-purpose sweep; superseded by `resolve-all`        |

Cron routes accept GET (Vercel Cron) and POST (manual triggering). If `CRON_SECRET` is set, the `Authorization: Bearer <secret>` header is required; if unset, they're open (dev convenience).

---

## Cron Jobs (vercel.json)

| Path                  | Schedule    | Purpose                              |
| --------------------- | ----------- | ------------------------------------ |
| `/api/gauntlet/seed`  | `0 0 * * *` | Seed today's Gauntlet question       |
| `/api/cron/resolve-all` | `5 0 * * *` | Resolve contests + lobbies past `endAt` |

Vercel Hobby caps crons at once/day, which is why contest and lobby sweeps are merged into `resolve-all`. Lazy-resolve-on-view still resolves instantly regardless of cron cadence.

---

## Code Style Guidelines

### Formatting

- **Prettier**: tabs, single quotes, no trailing commas, print width 100.
- Plugins: `prettier-plugin-svelte`, `prettier-plugin-tailwindcss` (`tailwindStylesheet` points to `src/routes/layout.css`).
- Run `npm run format` before committing.

### Linting

- **ESLint** flat config (`eslint.config.js`): `@eslint/js/recommended` + `typescript-eslint/recommended` + `eslint-plugin-svelte/recommended` + Prettier compat; respects `.gitignore`.
- `no-undef` is off (TypeScript handles it).
- Run `npm run lint` before committing.

### TypeScript

- Strict mode; `moduleResolution: "bundler"`; `rewriteRelativeImportExtensions: true`; `checkJs: true`.
- `svelte.config.js` extends the generated tsconfig to also include `drizzle.config.ts`.

### Conventions

- Svelte 5 runes only.
- Comments in this codebase explain **why**, often with the incident that motivated the code (rate-limit hangs, SSR crashes, reasoning-model token budgets). Keep that style: if you work around a non-obvious external behavior, write it down inline.
- Numeric DB columns are strings at the TS layer — `Number(...)` on read, `String(...)` on write.
- Most mutations are written to be **idempotent** (resolution functions, badge grants, seeding) because both lazy-on-view and cron paths can call them.

---

## Testing Instructions

There is **no automated test suite**. Validation is manual:

1. `npm run check` (type-check) and `npm run lint`.
2. `npm run dev`, then the end-to-end manual flow:
   - Connect a wallet (EVM or Solana) via Reown AppKit in the nav; confirm the session cookie is set.
   - From `/dashboard`: create a contest, draft 5 picks on `/draft`, submit.
   - Visit `/contest/result?contestId=...` to lazy-resolve and view the result; confirm the AI breakdown loads (or 502s gracefully).
   - Exercise matchmaking (`/matchmaking`), lobbies (`/lobby`), Gauntlet, research boost, and leagues as relevant to your change.
   - Manually trigger crons with `POST /api/gauntlet/seed` and `POST /api/cron/resolve-all`.
- `docs-project/testing-findings.md` records past manual testing sessions.

`docs-project/` also holds the design PRD, user stories, 0G/Midnight integration research, and roadmap docs — check there before changing product behavior.

---

## Security Considerations

- **Never expose `SOSOVALUE_API_KEY`, `GROQ_API_KEY`, or `ZG_COMPUTE_API_KEY` to the browser.** They are only imported in `+server.ts` files or `src/lib/server/` modules.
- Session cookie: `httpOnly`, `sameSite: 'strict'`, 7-day expiry. The token scheme is a secret-suffix signature, not a true HMAC — adequate for current scope, worth upgrading if auth stakes grow.
- The nonce cookie is deleted after successful verification.
- Wallet auth is the only auth method.
- `/share/[id]` and `/api/contest/[id]/card` are intentionally unauthenticated (crawlers), but scoped: they 404 unless the contest is resolved and `u` is a participant, and only expose that participant's own picks.
- Cron endpoints are Bearer-gated by `CRON_SECRET` when it's set.
- No application-level rate limiter; SoSoValue client retries on 429 with a capped wait.

---

## Deployment

- **Vercel** with `@sveltejs/adapter-vercel`; build command `npm run build`.
- Set all env vars from `.env.example` in Vercel project settings (including `CRON_SECRET` for the two cron jobs in `vercel.json`).

---

## Legacy / Known Issues

- `src/lib/tokenRegistry.ts` is a Wave 1 hardcoded draft pool whose `currency_id` fields were never populated; the live draft pool comes from `/api/tokens`. Check whether anything still imports it before relying on it.
- `bcryptjs` (+ `@types/bcryptjs`) remains in `package.json` from the removed email/password auth — unused.
- `/api/cron/resolve-contests` and `/api/cron/resolve-lobbies` still exist but are not in `vercel.json`; `/api/cron/resolve-all` covers both.
- `/manager` is a 308 redirect to `/dashboard`.
- `src/lib/server/sodex.ts` does not talk to SoDEX's real Trading API (that needs an EIP712-signed SoDEX account); it wraps the SoSoValue market snapshot. See the file's header comment.
- The bot-opponent score is synthetic. Real 1v1 opponents come from the matchmaking queue; if no one is waiting, the queue just waits (30s staleness) rather than falling back to a bot mid-queue.
- Lobby resolution intentionally does not touch league standings (see `lobby-resolution.ts` comment).
