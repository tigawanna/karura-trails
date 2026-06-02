# SpatiaLite on Karura Trails Mobile

Reference for using SpatiaLite with **op-sqlite**, **Drizzle ORM**, and **Expo** in this app. The approach matches the maintained demo stack ([expo-opsqlite-spatialite-demo](https://github.com/tigawanna/expo-opsqlite-spatialite-demo)) and prebuilt binaries from [react-native-spatialite-artifacts](https://github.com/tigawanna/react-native-spatialite-artifacts).

---

## Stack

| Layer                   | Package / path                                      |
| ----------------------- | --------------------------------------------------- |
| SQLite driver           | `@op-engineering/op-sqlite`                         |
| Spatial extension       | `libspatialite.so` (Android) via config plugin      |
| ORM                     | `drizzle-orm` + `drizzle-orm/op-sqlite`             |
| Custom geometry columns | `src/lib/drizzle/spatial-types.ts`                  |
| DB bootstrap            | `src/lib/drizzle/InitDatabase.tsx`                  |
| Raw spatial SQL         | `executeQuerySync()` in `src/lib/drizzle/client.ts` |

**Not supported:** Expo Go (no native SpatiaLite). Use a dev build (`pnpm run:android` / `pnpm prebuild:android`).

---

## Native libraries (Android)

Binaries are **not** committed to git. They are downloaded at prebuild time.

1. Version pin: `spatialite.release.json` (currently `tigawanna/react-native-spatialite-artifacts` release `0.0.1`).
2. Fetch: `pnpm fetch:spatialite` (runs automatically in `prebuild` / `prebuild:android` / `run:android`).
3. Plugin: `plugins/opsqlite-spatialite/with-spatialite.js` copies `.so` files into `jniLibs` per ABI.

```bash
cd apps/mobile
pnpm fetch:spatialite
pnpm prebuild:android
pnpm run:android
```

Upstream artifact layout (from [react-native-spatialite-artifacts README](https://github.com/tigawanna/react-native-spatialite-artifacts)):

```
jniLibs/
├── arm64-v8a/libspatialite.so
├── armeabi-v7a/libspatialite.so
├── x86/libspatialite.so
└── x86_64/libspatialite.so
```

Load the extension once when opening the database (`src/lib/drizzle/client.ts`):

```ts
import { open } from "@op-engineering/op-sqlite";

const opsqliteDb = open({ name: DATABASE_NAME, location: DATABASE_LOCATION });
opsqliteDb.loadExtension("libspatialite", "sqlite3_modspatialite_init");
```

iOS: artifacts and plugin support are planned upstream; this app is Android-first for SpatiaLite today.

---

## Startup sequence

Order matters. `InitDatabase` does:

1. **Drizzle migrations** — creates tables with `geom` as plain `BLOB` (see `drizzle/*.sql`).
2. **`ensureSpatialMetadata()`** — `InitSpatialMetaData(1)` + cleanup of legacy geometry registration (see below).
3. **Seed** — inserts trails via Drizzle + custom geometry types (`src/lib/drizzle/seed.ts`).

```ts
await ensureSpatialMetadata();
await seedTrailsFromGeoJSON(db, geojson);
```

### What `ensureSpatialMetadata()` does

```sql
SELECT InitSpatialMetaData(1);
```

Then `discardRegisteredGeometryColumns()` removes any rows in `geometry_columns` and their **insert/update triggers** for `paths.geom`, `points.geom`, and `hikes.geom`.

### What we deliberately do **not** do

Do **not** call `AddGeometryColumn()` or `RecoverGeometryColumn()` for normal app flow.

Those functions register strict `BEFORE INSERT` triggers (`GeometryConstraints`). With Drizzle migrations that already define `geom` as `BLOB`, registration is easy to get wrong (type/dimension mismatch) and inserts fail with opaque “Failed query” errors.

The recommended mobile pattern (demo + this app):

- Table column: `geom BLOB` from Drizzle migration.
- Writes: `SetSRID(GeomFromGeoJSON(...), 4326)` via custom Drizzle types.
- Reads: `AsGeoJSON(geom)` — never read raw BLOB in JS (no Node `Buffer` on React Native).

If you previously experimented with `RecoverGeometryColumn`, **clear app data** or reinstall so triggers are dropped and seed runs on a clean DB.

---

## Drizzle geometry types

Defined in `src/lib/drizzle/spatial-types.ts`:

| Export        | Use case      | `toDriver`                          |
| ------------- | ------------- | ----------------------------------- |
| `lineStringZ` | Trails, hikes | `SetSRID(GeomFromGeoJSON(?), 4326)` |
| `pointZ`      | POIs, markers | `SetSRID(GeomFromGeoJSON(?), 4326)` |

Schema example (`paths.geom`):

```ts
geom: lineStringZ("geom"),
```

Insert (seed or app code):

```ts
await db.insert(paths).values({
  slug: "my-trail",
  name: "My Trail",
  geom: JSON.stringify({
    type: "LineString",
    coordinates: [
      [36.82, -1.24, 1685],
      [36.83, -1.25, 1690],
    ],
  }),
});
```

Drizzle expands `geom` to `SetSRID(GeomFromGeoJSON(?), 4326)` in SQL. Do not pass `id: null`; omit `id` and let SQLite autoincrement.

---

## Reading geometry

Always project to GeoJSON in SQL:

```sql
SELECT id, name, AsGeoJSON(geom) AS geom_json FROM paths WHERE id = ?;
```

Parse `geom_json` with `JSON.parse` in TypeScript. Example: `getPathElevationProfile()` in `src/services/spatial/spatial.service.ts`.

---

## Spatial queries (`executeQuerySync`)

Use `executeQuerySync()` from `src/lib/drizzle/client.ts` when SQL is not practical in Drizzle’s query builder.

### Nearest path (meters)

Use `Distance(geom, point, 0)` for great-circle **meters** on WGS84. Prefer this over bare `ST_Distance(a, b)` on SRID 4326, which returns **degrees** and is misleading.

```sql
SELECT id, name, slug, distance_m
FROM (
  SELECT p.id, p.name, p.slug,
         Distance(p.geom, MakePoint(36.8219, -1.2921, 4326), 0) AS distance_m
  FROM paths p
)
WHERE distance_m <= 200
ORDER BY distance_m
LIMIT 3;
```

We do **not** rely on `SpatialIndex` / `CreateSpatialIndex` in this app (that requires `AddGeometryColumn`). With ~40 trails, a full table scan is fine.

### Reference point for queries

```sql
MakePoint(longitude, latitude, 4326)
```

---

## Coordinates and GeoJSON

| Context                     | Order                                              | Example (near Karura)                 |
| --------------------------- | -------------------------------------------------- | ------------------------------------- |
| GeoJSON `coordinates`       | `[longitude, latitude]` or `[lng, lat, elevation]` | `[36.82427, -1.24135, 1685]`          |
| `ST_X(geom)` / `ST_Y(geom)` | X = lng, Y = lat                                   |                                       |
| `MakePoint`                 | `MakePoint(lng, lat, srid)`                        | `MakePoint(36.82427, -1.24135, 4326)` |
| UI labels                   | Often “lat, lng”                                   | Display only; storage stays lng-first |

3D trails: GeoJSON `type` remains `"LineString"`; elevation is the third coordinate. No need for `CastToXYZ` if all vertices include Z and you use `SetSRID(GeomFromGeoJSON(...), 4326)`.

---

## File map

| File                                             | Role                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `src/lib/drizzle/client.ts`                      | Open DB, load extension, `ensureSpatialMetadata`, `executeQuerySync` |
| `src/lib/drizzle/spatial-setup.ts`               | `DiscardGeometryColumn` cleanup for legacy DBs                       |
| `src/lib/drizzle/spatial-types.ts`               | Drizzle `lineStringZ` / `pointZ`                                     |
| `src/lib/drizzle/InitDatabase.tsx`               | Migrations → spatial init → seed                                     |
| `src/lib/drizzle/seed.ts`                        | Import `assets/data/trails.geojson`                                  |
| `src/services/spatial/spatial.service.ts`        | Nearest path, elevation profile                                      |
| `src/services/elevation/elevation.service.ts`    | Elevation inference along paths                                      |
| `plugins/opsqlite-spatialite/with-spatialite.js` | Copies native libs at prebuild                                       |
| `scripts/fetch-spatialite-libs.js`               | Downloads release zip from GitHub                                    |

---

## Troubleshooting

| Symptom                                         | Likely cause                         | Fix                                                                                      |
| ----------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `libspatialite` / extension errors              | Expo Go or missing native build      | `pnpm fetch:spatialite`, `pnpm prebuild:android`, `pnpm run:android`                     |
| Insert fails on `geom` after schema experiments | `RecoverGeometryColumn` triggers     | Reinstall app or clear data; ensure `ensureSpatialMetadata` runs (discards registration) |
| Seed skipped                                    | `paths` already has rows             | Clear DB or delete app storage                                                           |
| Distances look like tens between far places     | Used `ST_Distance` as meters on 4326 | Use `Distance(..., 0)` or haversine                                                      |
| `SpatialIndex` returns nothing                  | No R-Tree created                    | Use table scan + `Distance` (current code)                                               |
| Stale JS after SQL changes                      | Metro cache                          | `expo start -c`                                                                          |

---

## External references

### This ecosystem (start here)

- [react-native-spatialite-artifacts](https://github.com/tigawanna/react-native-spatialite-artifacts) — prebuilt Android/iOS libs, 16KB page alignment, release zips.
- [expo-opsqlite-spatialite-demo](https://github.com/tigawanna/expo-opsqlite-spatialite-demo) — working RN + Drizzle + SpatiaLite demo; **“Writing good geospatial queries”** section in README.
- [op-sqlite](https://github.com/OP-Engineering/op-sqlite) — SQLite for React Native, extension loading.

### ORM

- [Drizzle — Get started with OP-SQLite](https://orm.drizzle.team/docs/get-started/op-sqlite-new)
- [Drizzle — Expo SQLite migrations](https://orm.drizzle.team/docs/connect-expo-sqlite) (same migrator pattern as op-sqlite)

### SpatiaLite (official)

- [SpatiaLite home](https://www.gaia-gis.it/fossil/libspatialite/index)
- [SpatiaLite cookbook — creating a geometry column](https://www.gaia-gis.it/gaia-sins/spatialite-cookbook/html/new-geom.html) — `AddGeometryColumn` / `RecoverGeometryColumn` (desktop/GIS workflows; different from our mobile blob pattern).
- [SpatiaLite SQL functions reference](https://www.gaia-gis.it/gaia-sins/spatialite-sql-latest.html) — `GeomFromGeoJSON`, `AsGeoJSON`, `Distance`, `MakePoint`, `SetSRID`, etc.

### Project docs

- `AGENTS.md` — stack summary and conventions.
- `GAMEPLAN.md` — schema rationale and elevation/path design.

---

## Quick checklist

- [ ] Dev build, not Expo Go
- [ ] `pnpm fetch:spatialite` before prebuild
- [ ] `InitSpatialMetaData(1)` once per process before spatial reads/writes
- [ ] Write: `SetSRID(GeomFromGeoJSON(...), 4326)` via `lineStringZ` / `pointZ`
- [ ] Read: `AsGeoJSON(geom)`
- [ ] GeoJSON coordinates: `[lng, lat]` or `[lng, lat, z]`
- [ ] Distances in meters: `Distance(g1, g2, 0)` with `MakePoint(lng, lat, 4326)`
- [ ] After changing spatial init or seed logic: clear app data and re-run
