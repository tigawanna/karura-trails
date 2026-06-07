import type { RoutingGraphSeedJson } from "@/geo/routing-graph-seed.types";
import type { PointCategory } from "@/lib/drizzle/schema";
import type { DrizzleDB } from "./client";
import { pointNeighbors, points } from "./schema";
import { count, isNotNull } from "drizzle-orm";

const VALID_CATEGORIES = new Set<PointCategory>([
  "junction",
  "gate",
  "viewpoint",
  "rest_area",
  "water",
  "cave",
  "sign",
  "custom",
]);

function normalizeCategory(value: string): PointCategory {
  if (VALID_CATEGORIES.has(value as PointCategory)) {
    return value as PointCategory;
  }
  return "custom";
}

function geometryToString(
  geometry: RoutingGraphSeedJson["points"]["features"][number]["geometry"],
): string {
  return JSON.stringify(geometry);
}

function resolveSeedRef(
  feature: RoutingGraphSeedJson["points"]["features"][number],
  usedRefs: Set<string>,
): string | null {
  const properties = feature.properties;
  const base = properties.ref?.trim() || properties.name?.trim() || `source-${properties.id}`;

  if (!usedRefs.has(base)) {
    usedRefs.add(base);
    return base;
  }

  const disambiguated = `${base}#${properties.id}`;
  usedRefs.add(disambiguated);
  return disambiguated;
}

export async function seedRoutingGraphFromJson(
  database: DrizzleDB,
  seed: RoutingGraphSeedJson,
): Promise<{ pointCount: number; neighborCount: number }> {
  const expectedPointCount = seed.points.features.length;
  const [{ total }] = await database
    .select({ total: count() })
    .from(points)
    .where(isNotNull(points.sourceId));

  if (total >= expectedPointCount) {
    return { pointCount: total, neighborCount: 0 };
  }

  if (total > 0) {
    await database.delete(pointNeighbors);
    await database.delete(points).where(isNotNull(points.sourceId));
  }

  return database.transaction(async (tx) => {
    const sourceIdToPointId = new Map<number, number>();
    const usedRefs = new Set<string>();

    for (const feature of seed.points.features) {
      const properties = feature.properties;
      const ref = resolveSeedRef(feature, usedRefs);
      const now = properties.updatedAt || new Date().toISOString();

      const [created] = await tx
        .insert(points)
        .values({
          ref,
          name: properties.name,
          description: properties.description,
          category: normalizeCategory(properties.category),
          nodeRole: properties.nodeRole,
          sourceId: properties.id,
          sortOrder: properties.sortOrder,
          parentRef: properties.parentRef,
          metadataJson: JSON.stringify(properties.metadata ?? {}),
          elevation: properties.elevation,
          elevationSource: properties.elevationSource,
          geom: geometryToString(feature.geometry),
          createdAt: properties.createdAt || now,
          updatedAt: now,
        })
        .returning({ id: points.id });

      if (!created) {
        throw new Error(`Failed to seed point source id ${properties.id}`);
      }

      sourceIdToPointId.set(properties.id, created.id);
    }

    let neighborCount = 0;

    for (const neighbor of seed.neighbors) {
      const fromPointId = sourceIdToPointId.get(neighbor.fromMarkerId);
      const toPointId = sourceIdToPointId.get(neighbor.toMarkerId);

      if (fromPointId === undefined || toPointId === undefined) {
        continue;
      }

      await tx.insert(pointNeighbors).values({
        fromPointId,
        toPointId,
        sourceId: neighbor.id,
      });

      neighborCount += 1;
    }

    return {
      pointCount: sourceIdToPointId.size,
      neighborCount,
    };
  });
}
