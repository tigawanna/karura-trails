import { getDb } from "./client";
import type { TrailFeatureCollection } from "@/types/geojson";

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

export function seedTrailsFromGeoJSON(geojson: TrailFeatureCollection): number {
  const rawDb = getDb();

  const existingResult = rawDb.executeSync("SELECT COUNT(*) as count FROM paths;");
  const existingCount = (existingResult.rows[0] as Record<string, number> | undefined)?.count ?? 0;

  if (existingCount > 0) {
    return existingCount;
  }

  rawDb.executeSync("BEGIN TRANSACTION;");

  try {
    let inserted = 0;

    for (const feature of geojson.features) {
      const { slug, name, source, vertexCount } = feature.properties;
      const coords = feature.geometry.coordinates;
      const stats = computeTrailStats(coords);

      const geojsonStr = JSON.stringify(feature.geometry);

      rawDb.executeSync(
        `INSERT INTO paths (
          slug, name, source, is_loop,
          distance_meters, elevation_gain, elevation_loss,
          min_elevation, max_elevation, vertex_count, geom
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          SetSRID(GeomFromGeoJSON(?), 4326)
        );`,
        [
          slug,
          name,
          source,
          stats.isLoop ? 1 : 0,
          stats.distanceMeters,
          stats.elevationGain,
          stats.elevationLoss,
          stats.minElevation,
          stats.maxElevation,
          vertexCount,
          geojsonStr,
        ],
      );

      inserted++;
    }

    rawDb.executeSync("COMMIT;");
    return inserted;
  } catch (error) {
    rawDb.executeSync("ROLLBACK;");
    throw error;
  }
}
