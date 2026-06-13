import {
  buildPendingSyncExportPayload,
  countPendingOutboundSyncEvents,
  listPendingOutboundSyncEvents,
  removeOutboundSyncEvent,
  updateOutboundSyncEventPayload,
} from "@/lib/sync/outbound-sync-events";
import { pushSyncEvents } from "@/lib/sync/push-sync-events";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { queryOptions } from "@tanstack/react-query";

export const pendingSyncEventsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.pendingSyncEvents],
  queryFn: listPendingOutboundSyncEvents,
});

export const pendingSyncCountQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.pendingSyncEvents, "count"],
  queryFn: countPendingOutboundSyncEvents,
});

export {
  buildPendingSyncExportPayload,
  pushSyncEvents,
  removeOutboundSyncEvent,
  updateOutboundSyncEventPayload,
};
