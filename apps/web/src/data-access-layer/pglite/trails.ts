import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { trailTable, type TrailRow } from "@/lib/pglite/schema/trail.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { TrailRecord } from "@/types/map/trails";
import { queryOptions } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";

function toRecord(row: TrailRow): TrailRecord {
  return {
    id: row.id,
    mapId: row.mapId,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    color: row.color,
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTrails(db: PgliteDb, mapId: number) {
  const rows = await db
    .select()
    .from(trailTable)
    .where(eq(trailTable.mapId, mapId))
    .orderBy(asc(trailTable.slug));

  return rows.map(toRecord);
}

export function trailsQueryOptions(db: PgliteDb, mapId: number) {
  return queryOptions({
    queryKey: pgliteQueryKeys.trails(mapId),
    queryFn: () => listTrails(db, mapId),
  });
}
