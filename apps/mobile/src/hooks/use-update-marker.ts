import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateMapMarkerQueries } from "@/lib/tanstack/invalidate-map-marker-queries";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { updateMarker } from "@/services/points/update-marker";

export function useUpdateMarker(onSaved?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMarker,
    meta: {
      invalidates: [
        [queryKeyPrefixes.capturedPoints],
        [queryKeyPrefixes.pendingSyncEvents],
        [queryKeyPrefixes.routingPoints],
      ],
    },
    onSuccess: async () => {
      await invalidateMapMarkerQueries(queryClient);
      onSaved?.();
    },
  });
}
