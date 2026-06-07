import { db } from "@/lib/drizzle/client";
import { landmarkTypes } from "@/lib/drizzle/schema";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { queryOptions } from "@tanstack/react-query";
import { asc } from "drizzle-orm";

import type { LandmarkTypeRecord } from "@/geo/landmark-type-records";

export const landmarkTypesQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.landmarkTypes],
  queryFn: async (): Promise<LandmarkTypeRecord[]> => {
    const rows = await db
      .select({
        id: landmarkTypes.id,
        sourceId: landmarkTypes.sourceId,
        slug: landmarkTypes.slug,
        label: landmarkTypes.label,
        sortOrder: landmarkTypes.sortOrder,
      })
      .from(landmarkTypes)
      .orderBy(asc(landmarkTypes.sortOrder), asc(landmarkTypes.label));

    return rows;
  },
});
