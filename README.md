# Habit AI

A personal truth log for mood, habits, and spending — built to compare what you **did** with what you **wanted**, without guilt-driven dashboards.

Local-first by default. Your data stays on your device until you choose to sync.

---

## Features

### Mobile (Expo · iOS)

- **Today** — single-screen check-in: mood, sleep, energy, wants, spending, context
- **Timeline** — scrollable history with day detail view
- **Wants** — track commitments, pause/resume, custom habits, weekly progress
- **Hearing** — investigate patterns across mood, habits, and spend; save rulings
- **You** — check-in rhythm, reminder time, haptics

### Desktop (Tauri + React)

- **Hearing** — same evidence engine as mobile, wired to local SQLite
- Browser preview for development (`desktop:web`)
- Native app shell via Tauri (macOS / Windows)

### Shared engine (`@habit-ai/db`)

- SQLite schema + Drizzle ORM
- Repository layer for check-ins, wants, hearings
- Hearing evidence builder (patterns, not assumptions)
- Cloud sync scaffolding (disabled by default)

---

## Architecture

```
habit-ai/
├── apps/
│   ├── mobile/     Expo SDK 54 · expo-sqlite · offline-first
│   └── desktop/    Vite + React · sql.js · Tauri FS persistence
├── packages/
│   ├── db/         Schema, migrations, repositories, hearing logic
│   ├── sync/       Supabase client + sync engine (future)
│   ├── ui/         Design tokens (colors, spacing, radius)
│   └── core/       Shared exports
└── supabase/       Postgres migrations + RLS (for sync later)
```

| Layer | Mobile | Desktop |
|-------|--------|---------|
| UI | React Native + Expo Router | React + Vite |
| Database | expo-sqlite | sql.js + Drizzle |
| Persistence | On-device SQLite | Tauri app data (browser: in-memory) |
| Sync | Off | Off |

Cloud sync is **off** (`CLOUD_SYNC_ENABLED = false` in `packages/db/src/config.ts`). The code path remains for a later phase.

---

## Requirements

- **Node.js** ≥ 20
- **pnpm** 9.15 (via `npx pnpm@9.15.0` — no global install required)
- **Mobile:** [Expo Go](https://expo.dev/go) (SDK 54) on iPhone, same Wi‑Fi as dev machine
- **Desktop (native):** Rust toolchain for Tauri

---

## Quick start

### 1. Install dependencies

```bash
npm run install:deps
```

### 2. Run mobile (recommended)

```bash
npm start
```

The terminal prints a URL like `exp://192.168.x.x:8081`. Open it in **Expo Go** (same Wi‑Fi).

**Remote / unstable Wi‑Fi:**

```bash
npm run start:tunnel
```

### 3. Run desktop (browser)

```bash
npm run desktop:web
```

Open [http://127.0.0.1:1420](http://127.0.0.1:1420)

### 4. Run desktop (native, optional)

```bash
npm run desktop
```

Requires Rust and Tauri. Persists SQLite to app data.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run install:deps` | Install monorepo dependencies |
| `npm start` | Mobile dev server (LAN) + connection URL |
| `npm run start:tunnel` | Mobile dev server via Expo tunnel |
| `npm run start:ios` | Open iOS simulator (requires Xcode) |
| `npm run desktop:web` | Desktop Hearing UI in browser |
| `npm run desktop` | Tauri native dev window |
| `npm run typecheck` | TypeScript check all packages |
| `npm run build` | Build all packages (Turbo) |

---

## Environment

Copy `.env.example` to `.env.local` when enabling Supabase sync:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Not required for local-only use.

---

## Development notes

- **Monorepo:** pnpm workspaces + Turborepo
- **Mobile DB:** `apps/mobile/lib/database.ts` — migrations on first launch
- **Desktop DB:** `apps/desktop/src/lib/database.ts` — sql.js + optional Tauri FS
- **Hearing logic:** `packages/db/src/hearing.ts` — shared by mobile and desktop

### Package manager

Root scripts use `npx pnpm@9.15.0` so a global `pnpm` install is optional. Alternatives:

```bash
corepack pnpm install    # if corepack is enabled
npm run install:deps     # recommended
```

---

## Roadmap

| Phase | Focus | Status |
|-------|--------|--------|
| **1** | Local mobile check-in, wants, timeline | Done |
| **2** | Hearing evidence board, pause wants, desktop shell | Done |
| **3** | Monthly wrap, AI summaries | Planned |
| **—** | Cloud sync (Supabase) | Scaffolded, off |

---

## License

See [LICENSE](LICENSE).
