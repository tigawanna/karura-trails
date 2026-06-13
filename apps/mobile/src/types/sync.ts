export type { SyncAction, SyncEventPayload } from "@/lib/sync/sync.types";

export interface SyncPushRequest {
  deviceId: string;
  events: import("@/lib/sync/sync.types").SyncEventPayload[];
}

export interface SyncPushResponse {
  accepted: number;
  hasMore: boolean;
  lastAcceptedId: string | null;
}
