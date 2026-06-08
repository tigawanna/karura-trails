import { recordLocalEvent } from "@/data-access-layer/pglite/local-events";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { geoSegmentTable, type GeoSegmentRow } from "@/lib/pglite/schema/geo-segment.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { GeoSegmentRecord, StoredLineStringGeometry } from "@/types/map/geo-segments";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { asc, count, eq } from "drizzle-orm";

function toRecord(row: GeoSegmentRow): GeoSegmentRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    segmentGroupId: row.segmentGroupId,
    segmentIndex: row.segmentIndex,
    name: row.name,
    pathKind: row.pathKind,
    status: row.status,
    coordinateSpace: row.coordinateSpace,
    geometryJson: row.geometryJson,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listGeoSegments(db: PgliteDb, mapId: number) {
  const rows = await db
    .select()
    .from(geoSegmentTable)
    .where(eq(geoSegmentTable.mapId, mapId))
    .orderBy(asc(geoSegmentTable.segmentGroupId), asc(geoSegmentTable.segmentIndex));

  return rows.map(toRecord);
}

export function geoSegmentsQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.geoSegments(mapId),
    queryFn: () => listGeoSegments(db, mapId),
  });
}

export async function createGeoSegment(
  db: PgliteDb,
  input: {
    mapId: number;
    segmentGroupId: string;
    segmentIndex: number;
    name?: string | null;
    geometry: StoredLineStringGeometry;
  },
) {
  const [row] = await db
    .insert(geoSegmentTable)
    .values({
      mapId: input.mapId,
      segmentGroupId: input.segmentGroupId,
      segmentIndex: input.segmentIndex,
      name: input.name ?? null,
      pathKind: "trail",
      status: "published",
      coordinateSpace: "wgs84",
      geometryJson: input.geometry,
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create geo segment.");
  }

  const record = toRecord(row);
  await recordLocalEvent(db, {
    tableName: "geo_segment",
    rowId: String(record.id),
    action: "create",
    payload: record as unknown as Record<string, unknown>,
  });

  return record;
}

type TrailsGeoJsonFeature = {
  type: "Feature";
  id?: string;
  properties?: { slug?: string; name?: string };
  geometry: StoredLineStringGeometry;
};

type TrailsGeoJson = {
  type: "FeatureCollection";
  features: TrailsGeoJsonFeature[];
};

export async function seedGeoSegmentsFromTrailsGeoJson(db: PgliteDb, mapId: number) {
  const [existing] = await db
    .select({ value: count() })
    .from(geoSegmentTable)
    .where(eq(geoSegmentTable.mapId, mapId));

  if ((existing?.value ?? 0) > 0) {
    return { imported: 0, skipped: true };
  }

  const response = await fetch("/trails.geojson");
  if (!response.ok) {
    throw new Error("Failed to load trails.geojson.");
  }

  const payload = (await response.json()) as TrailsGeoJson;
  let imported = 0;

  for (const [index, feature] of payload.features.entries()) {
    if (feature.geometry.type !== "LineString" || feature.geometry.coordinates.length < 2) {
      continue;
    }

    const coordinates = feature.geometry.coordinates.map(
      (entry) => [entry[0], entry[1]] as [number, number],
    );

    await createGeoSegment(db, {
      mapId,
      segmentGroupId: feature.properties?.slug ?? feature.id ?? `trail-${index}`,
      segmentIndex: 0,
      name: feature.properties?.name ?? null,
      geometry: { type: "LineString", coordinates },
    });
    imported += 1;
  }

  return { imported, skipped: false };
}

export function seedTrailsMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: () => seedGeoSegmentsFromTrailsGeoJson(db, mapId),
  });
}
