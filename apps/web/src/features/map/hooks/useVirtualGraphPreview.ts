import { previewBuildSegmentsFromPathQueryOptions } from "@/data-access-layer/pglite/segment-edges";
import type { VirtualPathPreview } from "@/lib/map/virtual-graph-preview.types";
import type { PgliteDb } from "@/lib/pglite/client";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

export function useVirtualGraphPreview(
  db: PgliteDb,
  mapId: number,
  pathSlugs: string[],
  enabled: boolean,
) {
  const queries = useQueries({
    queries: pathSlugs.map((pathSlug) =>
      previewBuildSegmentsFromPathQueryOptions(db, {
        mapId,
        pathSlug,
        maxProjectionDistanceMeters: 40,
        enabled: enabled && pathSlugs.length > 0,
      }),
    ),
  });

  const previews = useMemo(() => {
    const next = new Map<string, VirtualPathPreview>();
    for (const [index, pathSlug] of pathSlugs.entries()) {
      const result = queries[index]?.data;
      if (!result) {
        continue;
      }
      next.set(pathSlug, {
        ...result,
        edgeCount: result.proposed.length,
      });
    }
    return next;
  }, [pathSlugs, queries]);

  const loading = enabled && queries.some((query) => query.isPending);
  const failedQuery = queries.find((query) => query.error);
  const error = failedQuery?.error
    ? failedQuery.error instanceof Error
      ? failedQuery.error.message
      : String(failedQuery.error)
    : null;

  function reload() {
    for (const query of queries) {
      void query.refetch();
    }
  }

  return { previews, loading, error, reload };
}
