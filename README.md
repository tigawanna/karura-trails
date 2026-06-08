# Karura Trails

Forest trail maps, field marker capture, and an admin sync hub for Karura Forest.

| App        | Stack                                  | Purpose                                             |
| ---------- | -------------------------------------- | --------------------------------------------------- |
| **mobile** | Expo, MapLibre, SpatiaLite             | Offline maps, navigation, marker edits in the field |
| **web**    | TanStack Start, Cloudflare Workers, D1 | Landing page, admin dashboard, auth, sync API       |

Architecture detail: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) 9+
- For mobile: Android Studio and/or Xcode, Expo CLI workflow
- For web deploy: [Cloudflare](https://dash.cloudflare.com/) account + Wrangler

---

## Monorepo

```
apps/
  mobile/     Expo app (primary product)
  web/        TanStack Start on Cloudflare Workers
packages/     Shared TS / ESLint configs
```

Managed with **pnpm workspaces** and **Turborepo**.

---

## Getting started

### Install

```bash
pnpm install
```

### Web (admin + sync API)

```bash
cd apps/web
cp .env.example .env
cp .dev.vars.example .dev.vars   # edit secrets — see ARCHITECTURE.md
pnpm db:migrate:local
pnpm dev                         # http://localhost:3050
```

Sign up at `/auth/signup` with the email matching `ADMIN_EMAIL` in `.dev.vars` to access `/dashboard`.

### Mobile

```bash
cd apps/mobile
pnpm dev                         # Expo dev server
# or
pnpm run:android
pnpm run:ios
```

See `apps/mobile/GAMEPLAN.md` for schema, routing, and build profiles.

### All apps (from root)

```bash
pnpm dev
pnpm build
pnpm check-types
```

Filter to one app:

```bash
pnpm dev --filter=web
pnpm dev --filter=mobile
```

---

## Web environment

Two files in `apps/web`:

| File        | Scope                                                    |
| ----------- | -------------------------------------------------------- |
| `.env`      | Vite client (`VITE_API_URL`, `VITE_GOOGLE_AUTH_ENABLED`) |
| `.dev.vars` | Worker secrets (auth, CORS, sync secret, Google OAuth)   |

Full variable list: [ARCHITECTURE.md — Environment](./ARCHITECTURE.md#environment)

---

## Deploy web to Cloudflare

```bash
cd apps/web
# 1. Set real database_id in wrangler.jsonc (wrangler d1 create karura-trails-db)
# 2. wrangler secret put BETTER_AUTH_SECRET  (and other secrets)
pnpm db:migrate:remote
pnpm deploy
```

---

## Sync API (dev)

Mobile clients (or curl) can push events:

```bash
curl -X POST http://localhost:3050/api/sync/events \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: local-dev-sync-secret" \
  -d '{"deviceId":"test","events":[{"id":"01932f8a-7c3a-7000-8000-000000000001","deviceId":"test","table":"points","rowId":"42","action":"create","payload":{},"createdAt":"2026-06-08T12:00:00.000Z"}]}'
```

Admins verify events at `/events`. Verified events are returned on `GET /api/sync/events`.

Protocol: `apps/mobile/docs/EVENT-SYNC-PLAN.md`

---

## Quality

```bash
pnpm lint
pnpm format
pnpm quality        # lint + format check
pnpm quality:fix
```

---

## License

See per-app license files where applicable (`apps/mobile/LICENSE`).
