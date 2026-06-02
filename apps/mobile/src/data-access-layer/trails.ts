import { db } from "@/lib/drizzle/client";
import { paths } from "@/lib/drizzle/schema";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { queryOptions } from "@tanstack/react-query";
import { asc, eq, getTableColumns, sql } from "drizzle-orm";

const pathsColumns = getTableColumns(paths);

const trailSelect = {
  ...pathsColumns,
  geom: sql<string>`AsGeoJSON(${paths.geom})`.as("geom"),
};

export const trailsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.trails],
  queryFn: () => db.select(trailSelect).from(paths).orderBy(asc(paths.name)),
});

export function trailBySlugQueryOptions(slug: string) {
  return queryOptions({
    queryKey: [queryKeyPrefixes.trails, slug],
    queryFn: async () => {
      const rows = await db.select(trailSelect).from(paths).where(eq(paths.slug, slug)).limit(1);
      return rows[0];
    },
  });
}
