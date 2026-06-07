# Karura Desktop Modeling App — Agent Brief

Short instructions for the agent working on the **desktop data-modeling app**. Full mobile context: [`SEGMENT-ROUTING-PLAN.md`](./SEGMENT-ROUTING-PLAN.md).

---

## Your role

You own **topology and labels** (which points exist, how they connect). The mobile app owns **runtime** (routing, map UI, field capture). Do not duplicate turn-by-turn or navigation UI on desktop.

---

## What mobile expects from you

Export one **versioned JSON bundle** per release:

| Section  | Contents                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `paths`  | Existing `trails.geojson` FeatureCollection — **keep as-is** (LineStringZ, `slug`, rich elevation per vertex).              |
| `points` | Labeled markers: stable `ref`, `name`, `category`, coordinates `[lng, lat]` or `[lng, lat, elevation]`.                     |
| `links`  | Edges between adjacent points on one path: `fromRef`, `toRef`, `pathSlug`, `startFraction`, `endFraction`, `bidirectional`. |

Set top-level `version` (use `2`), `generatedAt`, optional `bbox`, and `fractionsProvided: true` when fractions are included.

**Example link:**

```json
{
  "fromRef": "13B",
  "toRef": "13C",
  "pathSlug": "blue-trail-142777583",
  "startFraction": 0.41,
  "endFraction": 0.47,
  "bidirectional": true
}
```

**Example point properties:**

```json
{
  "ref": "13B",
  "name": "Junction 13B",
  "category": "junction",
  "elevation": 1680,
  "elevationSource": "manual"
}
```

---

## Non-negotiable rules

1. **`ref` is the join key** — unique, stable, never reused for a different physical marker (e.g. `13B`, `GATE_A`).
2. **One `ref` per physical junction** — if three trails meet at the same post, they share one point/ref so the graph connects.
3. **WGS84 only** — `[lng, lat]` (EPSG:4326).
4. **Links only along a single `pathSlug`** — one trail segment between two consecutive nodes on that line; no cross-trail shortcuts in `links`.
5. **Prefer computing `startFraction` / `endFraction` on desktop** (point projected onto path, 0–1). Mobile can fall back via SpatiaLite if you set `fractionsProvided: false`.
6. **Idempotent export** — re-import must upsert by `ref` and `(fromRef, toRef, pathSlug)`.

---

## Point categories (use these strings)

| `category`                                                  | Routing                                |
| ----------------------------------------------------------- | -------------------------------------- |
| `junction`, `gate`                                          | Decision nodes — **must have `ref`**   |
| `viewpoint`, `water`, `cave`, `rest_area`, `sign`, `custom` | Landmarks / awareness (optional `ref`) |

---

## Highest-priority desktop features

1. **Two-click link tool** — select point A and B on the same path → create link + fractions.
2. **Ref uniqueness + validation** — duplicate refs, points far from any path, junctions with only one link, dangling refs in links.
3. **Elevation at points** — sample Z from path geometry when possible (`elevationSource`: `inferred_from_path` | `manual`).
4. **Bundle export** — single JSON file matching the shape above.

Route authoring (ordered chains of links) is **later**; links + points are enough for v1 mobile routing.

---

## What you will receive back from mobile (later)

Field-capture mode exports the **same bundle shape** with new/edited `points`. Merge by `ref`; treat mobile coords as manually ground-truthed (GPS in the forest is often wrong).

---

## Do not

- Change or strip Z from path coordinates.
- Rename existing path `slug` values without a migration plan (mobile keys segments on `pathSlug`).
- Invent a second export format unless agreed with mobile — one bundle contract.

---

## Questions / contract changes

Propose changes in the mobile repo (`SEGMENT-ROUTING-PLAN.md` §9) before implementing new required fields.
