# Karura Trails — Game Plan

## Vision

A mobile-first app for Karura Forest visitors to explore trails, mark points of interest, track elevation, plan hikes, and eventually share their activity socially — all powered by offline-first SpatiaLite + MapLibre.

---

## Data We Have

| Asset                 | Details                                                         |
| --------------------- | --------------------------------------------------------------- |
| `data/trails.geojson` | 38 named LineString trails with 3D coords (lng, lat, elevation) |
| Elevation range       | 1,642m – 1,739m                                                 |
| Total vertices        | 5,408 across all trails                                         |
| Bounding box          | `[36.7944, -1.25081, 36.84418, -1.22436]`                       |
| Sources               | Trailfork (32), AllTrails (6)                                   |

All coordinates carry elevation as the 3rd value: `[lng, lat, elevation_meters]`.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    UI Layer                           │
│  MapLibre (ShapeSource → LineLayer / SymbolLayer)     │
│  React Native Paper + Forest-green theme              │
│  Expo Router tabs                                     │
├──────────────────────────────────────────────────────┤
│                   Hook Layer                          │
│  useTrails() · usePoints() · useElevation()           │
│  useDeviceLocation() · useMapCamera()                 │
│  useNearestPath() · usePathElevationProfile()         │
├──────────────────────────────────────────────────────┤
│                 Data Access Layer                     │
│  Drizzle ORM (sqlite-proxy) + op-sqlite               │
│  SpatiaLite spatial queries (ST_*, AsGeoJSON, etc.)   │
├──────────────────────────────────────────────────────┤
│               Storage Layer                           │
│  SQLite + SpatiaLite extension                        │
│  Tables: paths · points · hikes · users (future)      │
└──────────────────────────────────────────────────────┘
```

---

## Database Schema

### Why separate `paths` and `points` tables?

1. **Points are atomic** — a marker at a junction, gate, viewpoint, or cave. Users create them in the field.
2. **Paths are continuous** — a named trail with hundreds of 3D vertices stored as a LineString.
3. **Joining** — points at intersections can reference multiple paths. A route is an ordered sequence of points connected by path segments.
4. **Querying** — finding "closest path to this point" or "elevation at this coordinate along a path" is far simpler when paths and points live in separate tables with spatial indexes.

### Table: `paths`

Stores each trail as a SpatiaLite LineStringZ geometry (preserving elevation per vertex).

| Column            | Type               | Description                                        |
| ----------------- | ------------------ | -------------------------------------------------- |
| `id`              | INTEGER PK         | Auto-increment                                     |
| `slug`            | TEXT UNIQUE        | URL-safe identifier (e.g. `access-road-142777583`) |
| `name`            | TEXT NOT NULL      | Display name                                       |
| `description`     | TEXT               | Trail description                                  |
| `source`          | TEXT               | Data origin (`trailfork`, `alltrails`, `user`)     |
| `difficulty`      | TEXT               | `easy` / `moderate` / `hard` / `expert`            |
| `surface_type`    | TEXT               | `dirt`, `gravel`, `paved`, `mixed`                 |
| `is_loop`         | INTEGER            | Boolean — does the path form a loop?               |
| `distance_meters` | REAL               | Computed total length                              |
| `elevation_gain`  | REAL               | Computed cumulative ascent in meters               |
| `elevation_loss`  | REAL               | Computed cumulative descent in meters              |
| `min_elevation`   | REAL               | Lowest point along the trail                       |
| `max_elevation`   | REAL               | Highest point along the trail                      |
| `vertex_count`    | INTEGER            | Number of coordinate points                        |
| `geom`            | BLOB (LineStringZ) | SpatiaLite geometry with elevation                 |
| `created_at`      | TEXT               | ISO timestamp                                      |
| `updated_at`      | TEXT               | ISO timestamp                                      |

**Spatial index** on `geom` for fast bounding-box and proximity queries.

**Key insight**: storing as `LineStringZ` (not stripping the Z) means every vertex retains its elevation. We can later query elevation at any point along the path using `ST_Line_Locate_Point` + interpolation.

### Table: `points`

Stores markers, junctions, gates, viewpoints, and user-placed pins.

| Column                  | Type                  | Description                                                                            |
| ----------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `id`                    | INTEGER PK            | Auto-increment                                                                         |
| `name`                  | TEXT                  | User-given label (e.g. "Point 24")                                                     |
| `description`           | TEXT                  | Notes or observations                                                                  |
| `category`              | TEXT                  | `junction` / `gate` / `viewpoint` / `rest_area` / `water` / `cave` / `sign` / `custom` |
| `photo_uri`             | TEXT                  | Local file path to photo taken at this point                                           |
| `elevation`             | REAL                  | Elevation in meters (auto-inferred or user-override)                                   |
| `elevation_source`      | TEXT                  | `gps` / `inferred_from_path` / `manual`                                                |
| `nearest_path_id`       | INTEGER FK → paths.id | Auto-populated closest trail                                                           |
| `nearest_path_name`     | TEXT                  | Denormalized for quick display                                                         |
| `nearest_path_distance` | REAL                  | Distance in meters to the closest path                                                 |
| `geom`                  | BLOB (PointZ)         | SpatiaLite geometry with elevation                                                     |
| `created_at`            | TEXT                  | ISO timestamp                                                                          |
| `updated_at`            | TEXT                  | ISO timestamp                                                                          |

**Spatial index** on `geom`.

### Table: `path_points` (junction table)

Links points to paths they intersect with, enabling multi-path junction modeling.

| Column              | Type                   | Description                                                    |
| ------------------- | ---------------------- | -------------------------------------------------------------- |
| `id`                | INTEGER PK             | Auto-increment                                                 |
| `path_id`           | INTEGER FK → paths.id  |                                                                |
| `point_id`          | INTEGER FK → points.id |                                                                |
| `position_on_path`  | REAL                   | 0.0–1.0 fraction along the path (from `ST_Line_Locate_Point`)  |
| `elevation_at_path` | REAL                   | Elevation interpolated from the path geometry at this position |

Unique constraint on `(path_id, point_id)`.

### Table: `hikes` (future — route planning & tracking)

| Column                 | Type               | Description                                      |
| ---------------------- | ------------------ | ------------------------------------------------ |
| `id`                   | INTEGER PK         | Auto-increment                                   |
| `name`                 | TEXT               | User-given hike name                             |
| `description`          | TEXT               |                                                  |
| `planned_at`           | TEXT               | When the route was planned                       |
| `started_at`           | TEXT               | When the user started walking                    |
| `completed_at`         | TEXT               | When they finished                               |
| `total_distance`       | REAL               | Meters                                           |
| `total_elevation_gain` | REAL               | Meters climbed                                   |
| `total_elevation_loss` | REAL               | Meters descended                                 |
| `duration_seconds`     | INTEGER            | Active hiking time                               |
| `status`               | TEXT               | `planned` / `active` / `completed` / `abandoned` |
| `geom`                 | BLOB (LineStringZ) | Recorded GPS track (if tracking was enabled)     |
| `created_at`           | TEXT               | ISO timestamp                                    |

### Table: `hike_waypoints` (ordered stops in a planned hike)

| Column     | Type                   | Description                                          |
| ---------- | ---------------------- | ---------------------------------------------------- |
| `id`       | INTEGER PK             |                                                      |
| `hike_id`  | INTEGER FK → hikes.id  |                                                      |
| `point_id` | INTEGER FK → points.id |                                                      |
| `sequence` | INTEGER                | Order in the route (0, 1, 2…)                        |
| `path_id`  | INTEGER FK → paths.id  | Trail segment to take from this waypoint to the next |

### Table: `user_profiles` (future — social features)

| Column                | Type                  | Description                     |
| --------------------- | --------------------- | ------------------------------- |
| `id`                  | INTEGER PK            |                                 |
| `display_name`        | TEXT                  |                                 |
| `avatar_uri`          | TEXT                  |                                 |
| `is_sharing_location` | INTEGER               | Boolean — live location sharing |
| `current_hike_id`     | INTEGER FK → hikes.id | Active hike (if sharing)        |
| `last_known_geom`     | BLOB (PointZ)         | Last GPS fix                    |
| `last_seen_at`        | TEXT                  |                                 |
| `created_at`          | TEXT                  |                                 |

---

## Elevation Inference Strategy

This is one of the most valuable features. Here's how it works:

### The Problem

A user places a pin at coordinates `(36.825, -1.242)`. We need to automatically determine:

1. The elevation at that point
2. Which trail(s) are nearest
3. The elevation _on that trail_ at the closest approach

### The Solution — Spatial Queries

```
Step 1: Find nearest path(s) within a search radius

  SELECT p.id, p.name,
         ST_Distance(p.geom, MakePointZ(:lng, :lat, 0, 4326), 1) AS distance_m
  FROM paths p
  WHERE distance_m <= 50   -- within 50 meters
  ORDER BY distance_m
  LIMIT 3;

Step 2: Find the position along the nearest path

  SELECT ST_Line_Locate_Point(p.geom, MakePoint(:lng, :lat, 4326)) AS fraction
  FROM paths p WHERE p.id = :nearest_path_id;

  -- fraction is 0.0 (start) to 1.0 (end)

Step 3: Extract the sub-segment and interpolate elevation

  Since LineStringZ stores elevation at every vertex, we can:
  a) Use ST_Line_Interpolate_Point(geom, fraction) to get the exact point on the path
  b) Read the Z value from the two surrounding vertices and linearly interpolate

  In practice, since SpatiaLite's ST_Line_Interpolate_Point may not
  preserve Z, we'll use a lightweight JS function:
  - Export the path segment as GeoJSON (AsGeoJSON with 3D coords)
  - Find the two vertices bracketing our fraction
  - Linear-interpolate the elevation between them
```

### The `getElevationAtPoint(lng, lat)` algorithm

```
1. Query all paths within 50m of the point
2. For the closest path:
   a. Get the fraction along the path
   b. Fetch the path's GeoJSON coordinates (3D)
   c. Walk the coordinate array, accumulating distance fractions
   d. Find the segment where our fraction falls
   e. Lerp the elevation between the two bounding vertices
3. Return { elevation, pathId, pathName, distanceToPath }
```

This gives us sub-meter elevation accuracy from our existing trail data, without needing a DEM or external elevation API.

---

## GeoJSON Storage Strategy

### Store the full LineStringZ as SpatiaLite geometry (not raw JSON)

**Why:**

- Spatial indexing (R-tree) for fast proximity queries
- Native `ST_Distance`, `ST_Contains`, `ST_Intersects` without parsing
- `AsGeoJSON(geom)` extracts any segment on demand (with elevation)
- `ST_Line_Substring(geom, start_frac, end_frac)` extracts path segments

**For the elevation query specifically:**

```sql
-- Extract just the segment near our point of interest
SELECT AsGeoJSON(ST_Line_Substring(geom, MAX(0, :frac - 0.01), MIN(1, :frac + 0.01)))
FROM paths WHERE id = :path_id;
```

This returns only a tiny slice of the path's GeoJSON (a few vertices around the target point), keeping JS-side processing minimal. We don't need to fetch the entire 500-vertex trail just to read one elevation value.

---

## Implementation Phases

### Phase 1: Foundation (this session)

1. **Install dependencies** — `@op-engineering/op-sqlite`, `drizzle-orm`, `@maplibre/maplibre-react-native`, `expo-location`
2. **Database layer** — Drizzle schema, SpatiaLite init, spatial type helpers
3. **Seed data** — Import `trails.geojson` into the `paths` table on first launch
4. **Map screen** — MapLibre `MapView` as the default landing screen showing Karura trails
5. **Basic interaction** — Tap a trail to see its name and elevation profile

### Phase 2: Points & Markers

1. **Point creation flow** — Long-press map → place pin → take photo → auto-infer elevation + nearest path → save
2. **Point display** — Markers on the map with category icons
3. **Path-point linking** — Auto-populate `path_points` when a point is near a path
4. **Elevation inference** — Implement the interpolation algorithm

### Phase 3: Route Planning

1. **Hike planner** — Select waypoints (points) → auto-connect via paths → show elevation profile
2. **Elevation profile chart** — Visualize climbs and descents for a planned route
3. **Turn-by-turn** — "At Point 24, turn left onto Sykes' Monkey Trail (climbing 15m over 200m)"

### Phase 4: Social & AI (future)

1. **User profiles** — Display name, avatar
2. **Live location sharing** — Opt-in broadcast of GPS position during a hike
3. **AI route planning** — "Plan a 5km moderate loop starting from the main gate" → AI queries paths + elevation + difficulty → suggests a route
4. **Activity feed** — See who's in Karura, which routes are popular today

---

## File Structure (Phase 1 target)

```
src/
├── app/
│   ├── _layout.tsx              ← Add DB provider wrapper
│   ├── index.tsx                ← Map screen (default landing)
│   ├── explore.tsx              ← Trail list / search
│   └── trail/[slug].tsx         ← Trail detail (future)
├── components/
│   ├── map/
│   │   ├── karura-map.tsx       ← MapLibre MapView + layers
│   │   ├── trail-layer.tsx      ← ShapeSource + LineLayer for trails
│   │   ├── point-layer.tsx      ← ShapeSource + SymbolLayer for markers
│   │   └── user-location.tsx    ← GPS pin
│   └── trails/
│       └── elevation-profile.tsx
├── hooks/
│   ├── use-trails.ts            ← Query all trails for map display
│   ├── use-trail-detail.ts      ← Single trail with full geometry
│   ├── use-points.ts            ← Query points near viewport
│   ├── use-device-location.ts   ← GPS position
│   └── use-elevation-at-point.ts
├── db/
│   ├── schema/
│   │   ├── paths.ts             ← Drizzle path table
│   │   ├── points.ts            ← Drizzle point table
│   │   ├── path-points.ts       ← Junction table
│   │   ├── hikes.ts             ← Future
│   │   └── index.ts             ← Re-exports
│   ├── spatial-types.ts         ← Custom Drizzle types for SpatiaLite
│   ├── client.ts                ← op-sqlite + Drizzle init
│   ├── provider.tsx             ← React context for DB access
│   └── seed.ts                  ← Import trails.geojson on first launch
├── services/
│   ├── elevation/
│   │   └── elevation.service.ts ← Elevation interpolation logic
│   └── spatial/
│       └── spatial.service.ts   ← Nearest-path, distance queries
├── lib/
│   └── map-libre/
│       ├── geom-parse.ts        ← GeoJSON parsing utilities
│       └── bbox.ts              ← Bounding box calculation
└── types/
    ├── trail.ts                 ← Path, Point, Hike types
    ├── geojson.ts               ← GeoJSON-specific types
    └── map.ts                   ← Map camera, viewport types
```

---

## Key Technical Decisions

| Decision            | Choice                             | Rationale                                                                                          |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Geometry storage    | SpatiaLite BLOB (not raw JSON)     | Spatial indexing, native ST\_\* functions, efficient sub-geometry extraction                       |
| LineString variant  | `LineStringZ` (3D)                 | Preserves per-vertex elevation natively                                                            |
| Elevation inference | Path-based interpolation (not DEM) | We already have dense elevation data in our trails; no external API needed                         |
| Points vs Paths     | Separate tables                    | Different lifecycles (user-created vs imported), different query patterns, clean junction modeling |
| Map library         | MapLibre React Native              | Already proven in geo-kenya, free tiles, offline support                                           |
| ORM                 | Drizzle + sqlite-proxy             | Type-safe queries, works with op-sqlite, custom spatial types                                      |
| Default screen      | Map (not list)                     | Users open the app to navigate the forest — map-first UX                                           |

---

## Map Style & UX

- **Default view**: Centered on Karura Forest bbox `[36.7944, -1.25081, 36.84418, -1.22436]`
- **Trails**: Colored by difficulty (green/yellow/orange/red) with name labels
- **Points**: Category-specific icons (junction dot, gate icon, viewpoint eye, etc.)
- **User location**: Pulsing GPS dot
- **Tap trail**: Bottom sheet with name, distance, elevation gain/loss, difficulty
- **Long-press**: Place a new point marker
- **Elevation profile**: Inline chart showing the trail's vertical profile

---

## Open Questions

1. **Tile source**: Use OpenStreetMap raster tiles, or a vector tile provider? For offline, we may want to bundle a low-zoom tile cache for Karura's bbox.
2. **Photo storage**: Store photos in the filesystem and reference by URI, or embed thumbnails in SQLite?
3. **Sync strategy**: When we add social features, how do we sync the local SQLite with a remote backend? (CRDTs? Last-write-wins? Event sourcing?)
4. **Route computation**: For AI route planning, do we compute shortest paths in SQL (Dijkstra on the path graph) or in JS?
