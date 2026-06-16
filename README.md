# Habit AI

Personal truth log — track mood, habits, and spending. Compare what you did to what you wanted.

## Stack

- **Mobile:** Expo (iOS) — daily capture
- **Desktop:** Tauri + React (macOS/Windows) — review mode
- **Monorepo:** pnpm + Turborepo
- **Local DB:** SQLite via Drizzle
- **Cloud:** Supabase (auth + sync)

## Current phase: 2

- Local-first mobile app (offline, no cloud sync)
- **Hearing** — evidence board with mood/habit/spend patterns
- Pause wants, save rulings
- Desktop shell (hearing layout preview)

Cloud sync is **off** (`CLOUD_SYNC_ENABLED = false`). Code remains for later.

## Getting started

First time only:

```bash
npm run install:deps
```

Then start the app (no Xcode needed):

```bash
npm start
```

Scan the **QR code** with your iPhone camera, or open it in the **Expo Go** app. Phone and Mac must be on the same Wi‑Fi.

> Requires **Expo Go** with SDK 54 (current App Store version). The project targets Expo SDK 54.

> **Note:** `npm start` runs the Expo dev server only. For the iOS Simulator you need Xcode installed, then use `npm run start:ios`.

**If you prefer pnpm directly** (after enabling it):

```bash
corepack pnpm install
corepack pnpm start
```

Other options:

```bash
npm run mobile        # Expo dev server (press i for iOS, a for Android)
npm run mobile:ios    # same as npm start
npm run desktop:web   # desktop UI in browser
```

### Fix `pnpm: command not found` permanently

Your Node install can't write to `/usr/local/bin`. Pick one:

```bash
# Option A — use corepack (no global install)
corepack pnpm install
corepack pnpm start
```

```bash
# Option B — install pnpm to your user folder
mkdir -p ~/.local/bin
npm config set prefix ~/.local
npm install -g pnpm@9.15.0
# add to ~/.zshrc: export PATH="$HOME/.local/bin:$PATH"
```

```bash
# Option C — one-time with sudo (if you're ok with that)
sudo corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### Enable sync (later — currently off)

Cloud sync is disabled in code. When ready, set `CLOUD_SYNC_ENABLED = true` in
`packages/db/src/config.ts` and configure Supabase keys.

### Desktop (web preview)

```bash
npm run desktop:web
```

Open http://127.0.0.1:1420

### Desktop (Tauri — requires Rust)

```bash
npm run desktop
```

## Project structure

```
apps/mobile/          Expo iOS app
apps/desktop/         Tauri + React (Mac/Win)
packages/db/          Schema, repositories, local sync helpers
packages/sync/        Supabase client + sync engine
packages/ui/          Design tokens
supabase/migrations/  Postgres schema + RLS
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | **Mobile app on iOS simulator** |
| `npm run install:deps` | Install dependencies (first time) |
| `npm run mobile` | Expo dev server (pick platform) |
| `npm run mobile:ios` | iOS simulator |
| `npm run desktop:web` | Desktop UI in browser |
| `npm run desktop` | Tauri dev (native window) |
| `npm run typecheck` | TypeScript all packages |

## Roadmap

- **Phase 2:** Hearing evidence board
- **Phase 3:** Monthly wrap + AI summaries
