import { db } from "@/lib/drizzle/client";
import { points, type PointSelect } from "@/lib/drizzle/schema";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { queryOptions } from "@tanstack/react-query";
import { desc, getTableColumns, isNull, sql } from "drizzle-orm";

export type PointWithGeometry = Omit<PointSelect, "geom"> & {
  geom: string;
};

const pointColumns = getTableColumns(points);

const pointSelect = {
  ...pointColumns,
  geom: sql<string>`AsGeoJSON(${points.geom})`.as("geom"),
};

export const capturedPointsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.capturedPoints],
  queryFn: () =>
    db
      .select(pointSelect)
      .from(points)
      .where(isNull(points.sourceId))
      .orderBy(desc(points.createdAt)) as Promise<PointWithGeometry[]>,
});
