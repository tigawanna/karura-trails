import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { isDevBuild } from "@/lib/dev/is-dev-build";
import { loadLocationSpoof } from "@/lib/dev/location-spoof-storage";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { subscribeLocationWatch } from "@/services/location/location-watch-service";

export function useLocationWatcher() {
  const queryClient = useQueryClient();
  const devBuild = isDevBuild();
  const { data: spoof } = useQuery({
    queryKey: [queryKeyPrefixes.devLocationSpoof],
    queryFn: loadLocationSpoof,
    enabled: devBuild,
  });

  const spoofEnabled = Boolean(spoof?.enabled);

  useEffect(() => {
    if (spoofEnabled) {
      return;
    }

    return subscribeLocationWatch(queryClient);
  }, [queryClient, spoofEnabled]);
}
