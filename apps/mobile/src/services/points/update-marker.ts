import { mergeMarkerCategoryMetadata, primaryMarkerCategory } from "@/geo/marker-categories";
import { readMarkerSyncOptOut, writeMarkerSyncOptOut } from "@/geo/marker-sync";
import { getTableColumns, sql } from "drizzle-orm";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/drizzle/client";
import { points, syncEvents, type PointCategory } from "@/lib/drizzle/schema";
import { getDeviceId } from "@/lib/sync/device-id";
import {
  cancelPendingOutboundSyncEventsForPoint,
  recordPointSyncEvent,
  updateOutboundSyncEventPayload,
} from "@/lib/sync/outbound-sync-events";
import { assertMarkerNameIsAvailable } from "@/services/points/marker-name-availability";

export interface UpdateMarkerInput {
  pointId: number;
  name: string | null;
  description: string | null;
  categories: PointCategory[];
  syncOptOut?: boolean;
}

export async function updateMarker(input: UpdateMarkerInput): Promise<void> {
  await assertMarkerNameIsAvailable(input.name, input.pointId);

  const [existing] = await db.select().from(points).where(eq(points.id, input.pointId)).limit(1);
  if (!existing) {
    throw new Error("Marker not found.");
  }

  const category = primaryMarkerCategory(input.categories);
  const categoryMetadata = mergeMarkerCategoryMetadata(existing.metadataJson, input.categories);
  const wasSyncOptOut = readMarkerSyncOptOut(existing.metadataJson);
  const nextSyncOptOut = input.syncOptOut ?? wasSyncOptOut;
  const metadataJson = writeMarkerSyncOptOut(categoryMetadata, nextSyncOptOut);
  const now = new Date().toISOString();
  const pointReturning = {
    ...getTableColumns(points),
    geom: sql<string>`AsGeoJSON(${points.geom})`.as("geom"),
  };

  const [updated] = await db
    .update(points)
    .set({
      name: input.name,
      description: input.description,
      category,
      metadataJson,
      updatedAt: now,
    })
    .where(eq(points.id, input.pointId))
    .returning(pointReturning);

  if (!updated) {
    throw new Error("Marker not found.");
  }

  const patch = {
    name: input.name,
    description: input.description,
    category,
    metadataJson,
  };

  const isCapturedMarker = existing.sourceId == null;

  if (isCapturedMarker && nextSyncOptOut) {
    await cancelPendingOutboundSyncEventsForPoint(input.pointId);
    return;
  }

  if (isCapturedMarker && wasSyncOptOut && !nextSyncOptOut) {
    await recordPointSyncEvent(updated, "create");
    return;
  }

  const deviceId = await getDeviceId();
  const pendingEvents = await db
    .select()
    .from(syncEvents)
    .where(
      and(
        eq(syncEvents.deviceId, deviceId),
        eq(syncEvents.rowId, String(input.pointId)),
        isNull(syncEvents.syncedAt),
      ),
    );

  const pendingCreate = pendingEvents.find((event) => event.action === "create");
  if (pendingCreate) {
    await updateOutboundSyncEventPayload(pendingCreate.id, patch);
    return;
  }

  const pendingUpdate = pendingEvents.find((event) => event.action === "update");
  if (pendingUpdate) {
    await updateOutboundSyncEventPayload(pendingUpdate.id, patch);
    return;
  }

  await recordPointSyncEvent(updated, "update");
}
