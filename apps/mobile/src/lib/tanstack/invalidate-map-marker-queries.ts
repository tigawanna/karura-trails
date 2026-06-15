import type { QueryClient } from "@tanstack/react-query";

import { queryKeyPrefixes } from "@/lib/tanstack/query/client";

export async function invalidateMapMarkerQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.capturedPoints] }),
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.routingPoints] }),
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.neighborLinks] }),
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.pendingSyncEvents] }),
  ]);
}
