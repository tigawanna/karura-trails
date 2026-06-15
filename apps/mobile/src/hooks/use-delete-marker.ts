import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateMapMarkerQueries } from "@/lib/tanstack/invalidate-map-marker-queries";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { deleteMarker } from "@/services/points/delete-marker";

export function useDeleteMarker(onDeleted?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMarker,
    meta: {
      invalidates: [
        [queryKeyPrefixes.capturedPoints],
        [queryKeyPrefixes.pendingSyncEvents],
        [queryKeyPrefixes.routingPoints],
      ],
    },
    onSuccess: async () => {
      await invalidateMapMarkerQueries(queryClient);
      onDeleted?.();
    },
  });
}
