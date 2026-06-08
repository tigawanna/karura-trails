import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { normalizeLandmarkSlug } from "@/lib/map/normalize-landmark-slug";
import {
  mapLandmarkTypeTable,
  type MapLandmarkTypeRow,
} from "@/lib/pglite/schema/map-landmark-type.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MapLandmarkTypeRecord } from "@/types/map/landmark-types";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { and, asc, eq } from "drizzle-orm";

export const SUGGESTED_LANDMARK_TYPES: Array<{ slug: string; label: string }> = [
  { slug: "bridge", label: "Bridge" },
  { slug: "waterfall", label: "Waterfall" },
  { slug: "toilet", label: "Toilet / loo" },
  { slug: "bench", label: "Bench" },
  { slug: "viewpoint", label: "Viewpoint" },
  { slug: "cave", label: "Cave" },
  { slug: "water", label: "Water" },
  { slug: "picnic", label: "Picnic area" },
  { slug: "parking", label: "Parking" },
  { slug: "gate", label: "Gate" },
  { slug: "sign", label: "Sign / guidepost" },
  { slug: "rest_area", label: "Rest area" },
  { slug: "memorial", label: "Memorial" },
  { slug: "trail_junction", label: "Trail junction" },
  { slug: "information", label: "Information" },
];

function toRecord(row: MapLandmarkTypeRow): MapLandmarkTypeRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    slug: row.slug,
    label: row.label,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function seedSuggestedLandmarkTypes(
  db: PgliteDb,
  mapId: number,
): Promise<MapLandmarkTypeRecord[]> {
  const now = new Date();
  const rows = await db
    .insert(mapLandmarkTypeTable)
    .values(
      SUGGESTED_LANDMARK_TYPES.map((entry, index) => ({
        mapId,
        slug: entry.slug,
        label: entry.label,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .returning();

  return rows.map(toRecord);
}

export async function listMapLandmarkTypes(db: PgliteDb, mapId: number) {
  let rows = await db
    .select()
    .from(mapLandmarkTypeTable)
    .where(eq(mapLandmarkTypeTable.mapId, mapId))
    .orderBy(asc(mapLandmarkTypeTable.sortOrder), asc(mapLandmarkTypeTable.label));

  if (rows.length === 0) {
    await seedSuggestedLandmarkTypes(db, mapId);
    rows = await db
      .select()
      .from(mapLandmarkTypeTable)
      .where(eq(mapLandmarkTypeTable.mapId, mapId))
      .orderBy(asc(mapLandmarkTypeTable.sortOrder), asc(mapLandmarkTypeTable.label));
  }

  return rows.map(toRecord);
}

export function mapLandmarkTypesQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.landmarkTypes(mapId),
    queryFn: () => listMapLandmarkTypes(db, mapId),
  });
}

export async function createMapLandmarkType(
  db: PgliteDb,
  input: { mapId: number; label: string; slug?: string },
) {
  const label = input.label.trim();
  if (!label) {
    throw new Error("Landmark label is required.");
  }

  const slug = normalizeLandmarkSlug(input.slug?.trim() || label);
  if (!slug) {
    throw new Error("Landmark slug is required.");
  }

  const [existing] = await db
    .select()
    .from(mapLandmarkTypeTable)
    .where(and(eq(mapLandmarkTypeTable.mapId, input.mapId), eq(mapLandmarkTypeTable.slug, slug)))
    .limit(1);

  if (existing) {
    return toRecord(existing);
  }

  const sortRows = await db
    .select({ sortOrder: mapLandmarkTypeTable.sortOrder })
    .from(mapLandmarkTypeTable)
    .where(eq(mapLandmarkTypeTable.mapId, input.mapId))
    .orderBy(asc(mapLandmarkTypeTable.sortOrder));

  const nextSortOrder = (sortRows.at(-1)?.sortOrder ?? -1) + 1;
  const now = new Date();

  const [row] = await db
    .insert(mapLandmarkTypeTable)
    .values({
      mapId: input.mapId,
      slug,
      label,
      sortOrder: nextSortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("Could not create landmark type.");
  }

  return toRecord(row);
}

export async function deleteMapLandmarkType(
  db: PgliteDb,
  input: { mapId: number; landmarkTypeId: number },
) {
  await db
    .delete(mapLandmarkTypeTable)
    .where(
      and(
        eq(mapLandmarkTypeTable.id, input.landmarkTypeId),
        eq(mapLandmarkTypeTable.mapId, input.mapId),
      ),
    );
}

export function createMapLandmarkTypeMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (input: { label: string; slug?: string }) =>
      createMapLandmarkType(db, { mapId, ...input }),
  });
}

export function deleteMapLandmarkTypeMutationOptions(db: PgliteDb, mapId: number) {
  return mutationOptions({
    mutationFn: (landmarkTypeId: number) => deleteMapLandmarkType(db, { mapId, landmarkTypeId }),
  });
}
