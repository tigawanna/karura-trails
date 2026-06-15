import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/drizzle/client";
import { points, syncEvents } from "@/lib/drizzle/schema";
import { getDeviceId } from "@/lib/sync/device-id";

export async function deleteMarker(pointId: number): Promise<void> {
  const [point] = await db.select().from(points).where(eq(points.id, pointId)).limit(1);
  if (!point) {
    throw new Error("Marker not found.");
  }

  const deviceId = await getDeviceId();
  await db
    .delete(syncEvents)
    .where(
      and(
        eq(syncEvents.deviceId, deviceId),
        eq(syncEvents.rowId, String(pointId)),
        isNull(syncEvents.syncedAt),
      ),
    );

  const deleted = await db.delete(points).where(eq(points.id, pointId)).returning({ id: points.id });
  if (deleted.length === 0) {
    throw new Error("Could not delete marker.");
  }
}
