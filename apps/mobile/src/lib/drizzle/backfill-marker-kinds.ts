import { resolveMarkerKind } from "@/geo/marker-kind";
import type { DrizzleDB } from "@/lib/drizzle/client";
import { points } from "@/lib/drizzle/schema";
import { eq, isNotNull, isNull, and } from "drizzle-orm";

export async function backfillMarkerKinds(database: DrizzleDB): Promise<number> {
  const rows = await database
    .select({
      id: points.id,
      ref: points.ref,
      name: points.name,
      parentRef: points.parentRef,
      metadataJson: points.metadataJson,
    })
    .from(points)
    .where(and(isNotNull(points.sourceId), isNull(points.markerKind)));

  for (const row of rows) {
    let metadata: Record<string, string> = {};
    try {
      metadata = JSON.parse(row.metadataJson ?? "{}") as Record<string, string>;
    } catch {
      metadata = {};
    }

    await database
      .update(points)
      .set({
        markerKind: resolveMarkerKind({
          ref: row.ref,
          name: row.name,
          parentRef: row.parentRef,
          metadata,
        }),
      })
      .where(eq(points.id, row.id));
  }

  return rows.length;
}
