# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hackathon Operations Hub** — multi-event management platform covering inventory, teams, scheduling, finance, certificates, venue booking, project judging, volunteers, and incident tracking. Supports multiple isolated hackathon events per deployment.

**Stack:**
- **Backend:** Node.js + Express + TypeScript (`server/`) — raw SQL via `pg` pool, JWT auth
- **Frontend:** React 18 + Vite + Tailwind + React Router v6 (`client/`)
- **Database:** PostgreSQL — SQL migrations in `server/src/db/migrations/`

### Critical Constraint: No ORM

All database access must use **raw parameterized SQL** (`$1` placeholders). No SQLAlchemy/Prisma/Sequelize/TypeORM or query builders. Keep SQL inside `*.repository.ts` files; use transactions (`BEGIN`/`COMMIT`/`ROLLBACK` on a pooled client) for multi-statement mutations.

```ts
// Correct — parameterized query
await pool.query("SELECT * FROM users WHERE email = $1", [email]);

// Wrong — never interpolate input into SQL
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

## Commands

```bash
# Backend (port 5000)                # Frontend (port 5173, proxies /api → :5000)
cd server && npm run dev             cd client && npm run dev
npm test                             npm test
npm run build                        npm run build        # tsc -b && vite build
npm run migrate                      npm run lint         # oxlint
npm run seed                         ./start.sh           # both servers + prereq checks
npm run db:setup                     # migrate + seed
npm run demo:on|off|status           # seed/purge the separate Demo Hackathon event
```

Environment: copy `.env.example` → `.env` (root, `server/`, `client/`). Server requires `DATABASE_URL`, `JWT_SECRET` (startup **fails fast** without it in production).

## Architecture

### Backend layers (strict)

```
routes → controller → service → repository → pool.query()
```

- `server/src/modules/<feature>/` — one folder per feature (auth, events, event-members, participants, teams, hardware, itinerary, checkin, certificates, venue, projects, judging, demo); each has `.routes/.controller/.service/.repository.ts`
- Routes mount at `/api/v1/events/:eventId/<feature>` (registered in `app.ts`; the plain `/api/v1/events` CRUD routes must stay **above** the scoped ones)
- Response envelope: `{ success, data }` or `{ success, error: { code, message } }`
- Auth chain: `authenticate` (JWT) → `requireEventRole(...roles)` (membership from `event_members`) or `requireEventRoleOrAdmin(...)` (platform-admin bypass) → `requireGlobalRole(...)` re-reads role from DB so demotions apply immediately
- Path params go through the `p(req, "eventId")` helper (`types/index.ts`) — Express 5 types params as `string | string[]`
- Throw typed errors from `middleware/error.middleware.ts` (`ValidationError`/`NotFoundError`/`ConflictError`/`AuthorizationError`). `normalizeDbError` maps pg codes (22P02, 22001, 22008, 23503, 23505, 23514, 23P01) to 4xx — extend it rather than leaking 500s

### Multi-tenancy invariant

Every table carries `event_id UUID FK`. **Every query filters by it**, and any body-supplied ID (item, team, location, user…) must be validated to belong to the route's `:eventId`. Audit new endpoints against this — cross-event ID injection is the recurring vulnerability class in this codebase.

Primary keys are **UUIDs** (`gen_random_uuid()`), not bigserial. Status enums are `VARCHAR + CHECK`.

### Frontend patterns

- Event isolation: routes are `/events/:eventId/<feature>`. Pages get their event via **`useScopedEventId()`** (`app/providers.tsx`) — the **URL param is the source of truth**; `ProtectedRoute` validates it against the member events list. Do not read the event ID from anywhere else.
- Non-React callers (api modules' default args, `useEventRole`) resolve the event through the module-level mirror in `lib/event-id.ts`, which `EventProvider` keeps in sync. If you add such a caller, prefer passing the ID explicitly instead.
- `useEventRole(eventId)` requires explicit eventId; role gates accept membership status `'active' | 'approved'`.
- Shared UI primitives live in `components/ui/` (`Button`, `Badge`/`StatusBadge`, `Dialog`, …); date/number formatting lives only in **`lib/formatters.ts`** (`formatDateTime`, `formatDateRange`, …) — do not add duplicates to `lib/utils.ts`.
- The app is dark-theme (`gray-950` base); badges/chips use the `-500/20 text-*-400` palette convention.

## Testing & Gotchas

- Vitest on both sides (`217` tests). Client tests mock api/hook modules wholesale; server service tests mock repositories. **This means migration/schema drift won't be caught by the suite** — after changing migrations, run them against a real DB (`npm run migrate`) and smoke-test the affected endpoints.
- Lesson learned the hard way: an `ON CONFLICT (...)` target that doesn't match a real unique index throws PG `42P10` at runtime on every call. When writing conflict targets, verify the index exists in a migration.
- Concurrency guards belong in the DB where possible: team joins use `SELECT … FOR UPDATE` (`addMemberAtomically`), QR tokens use conditional `UPDATE … WHERE used_at IS NULL RETURNING`, venue double-booking is enforced by a GiST exclusion constraint (migration 017).
- Demo mode is a real second event (fixed UUID `e0000000-…-0002`); toggling seeds/purges data server-side and switches client selection.

## Docs

`docs/` holds PRD, original schema documentation and diagrams — treat as **design intent, not ground truth**: implemented tables/columns differ (UUIDs, renamed tables like `hardware_items`/`itinerary_items`, extra constraints). Verify against `server/src/db/migrations/` before relying on either docs or this file.
