# Event sync plan — mobile ↔ backend

This document describes the planned event-sourced sync layer for Karura Trails mobile. **Not implemented yet.** Use this when building the Hono + Cloudflare Workers + D1 backend and the Expo client sync worker.

## Goals

- Every local mutation (create / update / delete) on any synced table emits an **event** row.
- Events use **UUIDv7** ids for global time-ordering without coordination across devices.
- Mobile can **push** pending events to a configured URL and **pull** new events since a cursor.
- Backend stores events, applies them to D1, and serves paginated replay to other clients.
- Other devices replay events locally to stay up to date.

## Event shape (mobile → server)

```json
{
  "id": "01932f8a-7c3a-7000-8000-000000000001",
  "deviceId": "expo-installation-id-or-generated-uuid",
  "table": "points",
  "rowId": "42",
  "action": "create | update | delete",
  "payload": {},
  "createdAt": "2026-06-06T12:00:00.000Z"
}
```

- `payload` is the **new** state for create/update, or minimal tombstone for delete.
- No `oldPayload` on the wire; replay is forward-only.
- `rowId` is the local SQLite primary key as string (or stable source id when seeded).

## Local SQLite (mobile)

### `sync_events` (outbox + applied log)

| Column         | Type      | Notes                            |
| -------------- | --------- | -------------------------------- |
| `id`           | TEXT PK   | UUIDv7                           |
| `device_id`    | TEXT      | Emitter                          |
| `table_name`   | TEXT      | e.g. `points`, `landmark_types`  |
| `row_id`       | TEXT      | Local row id                     |
| `action`       | TEXT      | `create` \| `update` \| `delete` |
| `payload_json` | TEXT      | JSON blob                        |
| `created_at`   | TEXT      | ISO timestamp                    |
| `synced_at`    | TEXT NULL | Set after successful push        |

### `sync_cursor` (single row)

| Column                 | Type      | Notes           |
| ---------------------- | --------- | --------------- |
| `last_pulled_event_id` | TEXT NULL | UUIDv7 cursor   |
| `push_url`             | TEXT NULL | User-configured |
| `pull_url`             | TEXT NULL | User-configured |

### Instrumentation

Wrap Drizzle mutations in a small `recordEvent({ table, rowId, action, payload })` helper that:

1. Inserts into `sync_events`.
2. Schedules background sync (Expo TaskManager / `expo-background-task`).

## Settings UI (mobile, later)

- **Sync** section in Settings:
  - Push URL
  - Pull URL (can be same base with different paths)
  - Device id (read-only)
  - Last sync time / pending event count
  - Manual “Sync now” button

## HTTP API (Hono on Cloudflare Workers)

Base: `https://api.example.com/v1/sync`

### Push — `POST /events`

Request:

```json
{
  "deviceId": "…",
  "events": [
    /* up to 50 events */
  ]
}
```

Response:

```json
{
  "accepted": 50,
  "hasMore": true,
  "lastAcceptedId": "01932f8a-…"
}
```

- Server validates, inserts into D1 `events` table (idempotent on `id`).
- Applies each event to domain tables in order within a D1 batch transaction.
- Returns `hasMore: false` when client outbox is empty for this batch.

### Pull — `GET /events?after={uuidv7}&limit=100`

Response:

```json
{
  "events": [
    /* up to 100 */
  ],
  "hasMore": true,
  "nextCursor": "01932f8a-…"
}
```

- `after` is exclusive; omit for from beginning (or genesis cursor).
- Client stores `nextCursor` as `last_pulled_event_id`.
- Loop until `hasMore` is false.

### Auth (later)

- Bearer token or Supabase/PocketBase passthrough headers from settings.
- URL-only mode for dev: optional shared secret header.

## D1 schema (backend)

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX events_created_at_idx ON events (id);
```

Domain tables (`points`, etc.) mirror mobile schema with `source_id` / `updated_at` for conflict debugging. Apply rules:

| Action | Behavior                    |
| ------ | --------------------------- |
| create | INSERT if row_id not exists |
| update | UPDATE by row_id or upsert  |
| delete | DELETE or soft-delete       |

## Mobile sync loop (Expo)

1. **Foreground:** after mutation, debounced push (50 events max per request).
2. **Background:** `expo-background-task` / `TaskManager`:
   - Push pending outbox.
   - Pull with cursor until `hasMore` false.
   - Apply pulled events to local DB via same replay helper.
3. **Replay:** for each pulled event, run table-specific applier (inverse of emit).

## UUIDv7

- Generate with `uuid` v7 or a small helper package.
- Sortable by time; safe for cursor pagination `WHERE id > ? ORDER BY id ASC LIMIT 100`.

## Phased rollout

| Phase | Scope                                         |
| ----- | --------------------------------------------- |
| A     | Local `sync_events` + emit on point edit only |
| B     | Settings URLs + manual push/pull              |
| C     | Hono Worker + D1 + replay                     |
| D     | Background sync + multi-device test           |
| E     | Supabase/PocketBase adapter docs              |

## Tables in scope (initial)

- `points` (marker edits from field capture)
- `landmark_types` (catalog changes)
- Later: `point_neighbors` if edited on device

## Out of scope for v1

- CRDT / merge conflict UI
- Binary attachments (photos) — separate upload URL + event reference
- Realtime WebSocket (pull-on-interval is enough initially)
