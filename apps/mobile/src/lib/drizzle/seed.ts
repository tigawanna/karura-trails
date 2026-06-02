import type { TrailFeatureCollection } from "@/types/geojson";
import { count } from "drizzle-orm";

import type { DrizzleDB } from "./client";
import { paths } from "./schema";

interface TrailStats {
  distanceMeters: number;
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
  isLoop: boolean;
}

function computeTrailStats(coordinates: [number, number, number][]): TrailStats {
  if (coordinates.length < 2) {
    return {
      distanceMeters: 0,
      elevationGain: 0,
      elevationLoss: 0,
      minElevation: coordinates[0]?.[2] ?? 0,
      maxElevation: coordinates[0]?.[2] ?? 0,
      isLoop: false,
    };
  }

  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let i = 0; i < coordinates.length; i++) {
    const elev = coordinates[i][2];
    if (elev < minElev) minElev = elev;
    if (elev > maxElev) maxElev = elev;

    if (i > 0) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];

      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLng = (lng2 - lng1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += 6371000 * c;

      const dElev = coordinates[i][2] - coordinates[i - 1][2];
      if (dElev > 0) elevationGain += dElev;
      else elevationLoss += Math.abs(dElev);
    }
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const closingDistance = Math.sqrt((last[0] - first[0]) ** 2 + (last[1] - first[1]) ** 2);
  const isLoop = closingDistance < 0.001;

  return {
    distanceMeters: Math.round(totalDistance),
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    minElevation: minElev,
    maxElevation: maxElev,
    isLoop,
  };
}

export async function seedTrailsFromGeoJSON(
  database: DrizzleDB,
  geojson: TrailFeatureCollection,
): Promise<number> {
  const [{ total }] = await database.select({ total: count() }).from(paths);

  if (total > 0) {
    return total;
  }

  return database.transaction(async (tx) => {
    let inserted = 0;

    for (const feature of geojson.features) {
      const properties = feature.properties;
      if (!properties) {
        throw new Error(`Trail feature is missing properties: ${String(feature.id ?? "unknown")}`);
      }

      const { slug, name, source, vertexCount } = properties;
      const coords = feature.geometry.coordinates;
      const stats = computeTrailStats(coords);
      const geojsonStr = JSON.stringify(feature.geometry);

      await tx.insert(paths).values({
        slug,
        name,
        source,
        isLoop: stats.isLoop,
        distanceMeters: stats.distanceMeters,
        elevationGain: stats.elevationGain,
        elevationLoss: stats.elevationLoss,
        minElevation: stats.minElevation,
        maxElevation: stats.maxElevation,
        vertexCount,
        geom: geojsonStr,
      });

      inserted++;
    }

    return inserted;
  });
}
