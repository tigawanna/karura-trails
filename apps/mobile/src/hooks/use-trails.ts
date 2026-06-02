import { useQuery } from "@tanstack/react-query";

import {
  trailBySlugQueryOptions,
  trailsQueryOptions,
} from "@/data-access-layer/trails";

export function useTrails() {
  return useQuery(trailsQueryOptions);
}

export function useTrailBySlug(slug: string | undefined) {
  return useQuery({
    ...trailBySlugQueryOptions(slug ?? ""),
    enabled: !!slug,
  });
}
