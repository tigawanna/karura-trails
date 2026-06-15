import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { landmarkTypesQueryOptions } from "@/data-access-layer/landmark-types";
import { neighborLinksQueryOptions } from "@/data-access-layer/routing-graph";
import { db } from "@/lib/drizzle/client";
import {
  countSkippedAppliedSyncEvents,
  countUnappliedSyncEvents,
} from "@/lib/sync/applied-sync-events";
import { reloadMarkerData } from "@/lib/sync/reload-marker-data";
import { readSyncReplayCacheSummary } from "@/lib/sync/sync-replay-cache";
import { invalidateMapMarkerQueries } from "@/lib/tanstack/invalidate-map-marker-queries";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";

export const markerLoadStatusQueryKey = [queryKeyPrefixes.routingPoints, "load-status"] as const;

async function readMarkerLoadStatus() {
  const [remainingUnapplied, remainingSkipped, replayCache] = await Promise.all([
    countUnappliedSyncEvents(db),
    countSkippedAppliedSyncEvents(db),
    readSyncReplayCacheSummary(),
  ]);

  return {
    remainingUnapplied,
    remainingSkipped,
    replayEventCount: replayCache?.eventCount ?? 0,
    replayCacheGeneratedAt: replayCache?.generatedAt ?? null,
    needsAttention: remainingUnapplied > 0 || remainingSkipped > 0,
  };
}

export function useMarkerLoadStatus() {
  return useQuery({
    queryKey: markerLoadStatusQueryKey,
    queryFn: readMarkerLoadStatus,
    staleTime: 30_000,
  });
}

export function useReloadMarkerData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reloadMarkerData(db),
    onError: (error: unknown) => {
      console.error("[reload-marker-data]", error);
    },
    onSuccess: async () => {
      await invalidateMapMarkerQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.neighborLinks] });
      await queryClient.invalidateQueries({ queryKey: landmarkTypesQueryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: neighborLinksQueryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: markerLoadStatusQueryKey });
    },
  });
}

export const useResumeMarkerLoad = useReloadMarkerData;
