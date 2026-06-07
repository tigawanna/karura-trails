import { db } from "@/lib/drizzle/client";
import { pointNeighbors, points } from "@/lib/drizzle/schema";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { queryOptions } from "@tanstack/react-query";
import { asc, eq, getTableColumns, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type { PointWithGeometry } from "@/data-access-layer/points";

export type NeighborLinkWithGeometry = {
  id: number;
  fromPointId: number;
  toPointId: number;
  fromRef: string | null;
  toRef: string | null;
  geom: string;
};

const pointColumns = getTableColumns(points);
const fromPoints = alias(points, "from_points");
const toPoints = alias(points, "to_points");

const routingPointSelect = {
  ...pointColumns,
  geom: sql<string>`AsGeoJSON(${points.geom})`.as("geom"),
};

export const routingPointsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.routingPoints],
  queryFn: () =>
    db
      .select(routingPointSelect)
      .from(points)
      .where(isNotNull(points.sourceId))
      .orderBy(asc(points.sortOrder), asc(points.id)) as Promise<PointWithGeometry[]>,
});

export const neighborLinksQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.neighborLinks],
  queryFn: async (): Promise<NeighborLinkWithGeometry[]> => {
    const rows = await db
      .select({
        id: pointNeighbors.id,
        fromPointId: pointNeighbors.fromPointId,
        toPointId: pointNeighbors.toPointId,
        fromRef: fromPoints.ref,
        toRef: toPoints.ref,
        fromGeom: sql<string>`AsGeoJSON(${fromPoints.geom})`.as("from_geom"),
        toGeom: sql<string>`AsGeoJSON(${toPoints.geom})`.as("to_geom"),
      })
      .from(pointNeighbors)
      .innerJoin(fromPoints, eq(pointNeighbors.fromPointId, fromPoints.id))
      .innerJoin(toPoints, eq(pointNeighbors.toPointId, toPoints.id));

    return rows.map((row) => ({
      id: row.id,
      fromPointId: row.fromPointId,
      toPointId: row.toPointId,
      fromRef: row.fromRef,
      toRef: row.toRef,
      geom: JSON.stringify({
        type: "LineString",
        coordinates: [JSON.parse(row.fromGeom).coordinates, JSON.parse(row.toGeom).coordinates],
      }),
    }));
  },
});
