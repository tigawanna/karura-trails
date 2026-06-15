import {
  listPendingOutboundSyncEvents,
  markOutboundSyncEventsSynced,
  toSyncEventPayload,
} from "@/lib/sync/outbound-sync-events";
import { getDeviceId } from "@/lib/sync/device-id";
import { syncLog, syncWarn } from "@/lib/sync/sync-log";
import type { SyncPushRequest, SyncPushResponse } from "@/types/sync";
import { buildSyncRequestHeaders, getSyncApiBaseUrl, getSyncApiSecret } from "@/services/sync/sync.api";

const PUSH_BATCH_LIMIT = 50;

export async function pushSyncEvents(eventIds?: string[]): Promise<{ pushed: number }> {
  const baseUrl = getSyncApiBaseUrl();
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_SYNC_API_URL is not configured.");
  }
  if (!getSyncApiSecret()) {
    throw new Error("EXPO_PUBLIC_SYNC_API_SECRET is not configured.");
  }

  const deviceId = await getDeviceId();
  let pending = await listPendingOutboundSyncEvents();
  if (eventIds && eventIds.length > 0) {
    const idSet = new Set(eventIds);
    pending = pending.filter((event) => idSet.has(event.id));
  }

  syncLog("push start", {
    baseUrl,
    deviceId,
    pending: pending.length,
    filter: eventIds?.length ?? "all",
  });

  if (pending.length === 0) {
    syncLog("push skipped", { reason: "no pending events" });
    return { pushed: 0 };
  }

  let totalPushed = 0;
  let batch = pending.slice(0, PUSH_BATCH_LIMIT);

  while (batch.length > 0) {
    const body: SyncPushRequest = {
      deviceId,
      events: batch.map((event) => toSyncEventPayload(event, deviceId)),
    };

    const url = `${baseUrl}/api/sync/events`;
    syncLog("push batch", {
      url,
      batchSize: batch.length,
      eventIds: batch.map((event) => event.id),
    });

    const response = await fetch(url, {
      method: "POST",
      headers: buildSyncRequestHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      syncWarn("push failed", { status: response.status, body: errorBody.slice(0, 300) });
      throw new Error(`Failed to push sync events (${response.status}).`);
    }

    const result = (await response.json()) as SyncPushResponse;
    const acceptedIds = batch.slice(0, result.accepted).map((event) => event.id);
    await markOutboundSyncEventsSynced(acceptedIds);
    totalPushed += result.accepted;

    syncLog("push batch accepted", {
      accepted: result.accepted,
      hasMore: result.hasMore,
      lastAcceptedId: result.lastAcceptedId,
    });

    if (!result.hasMore || result.accepted < batch.length) {
      break;
    }

    pending = await listPendingOutboundSyncEvents();
    if (eventIds && eventIds.length > 0) {
      const idSet = new Set(eventIds);
      pending = pending.filter((event) => idSet.has(event.id));
    }
    batch = pending.slice(0, PUSH_BATCH_LIMIT);
  }

  syncLog("push complete", { pushed: totalPushed });
  return { pushed: totalPushed };
}
