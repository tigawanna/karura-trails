import { executeQuerySync } from "@/lib/drizzle/client";

interface NearestPathResult {
  id: number;
  name: string;
  slug: string;
  distanceMeters: number;
}

export function findNearestPaths(
  lng: number,
  lat: number,
  limit = 3,
  radiusMeters = 200,
): NearestPathResult[] {
  const rows = executeQuerySync<{
    id: number;
    name: string;
    slug: string;
    distance_m: number;
  }>(
    `SELECT id, name, slug, distance_m
     FROM (
       SELECT p.id, p.name, p.slug,
              Distance(p.geom, MakePoint(${lng}, ${lat}, 4326), 0) AS distance_m
       FROM paths p
     )
     WHERE distance_m <= ${radiusMeters}
     ORDER BY distance_m
     LIMIT ${limit};`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    distanceMeters: r.distance_m,
  }));
}

export function getPathElevationProfile(pathId: number): { distance: number; elevation: number }[] {
  const rows = executeQuerySync<{ geom_json: string }>(
    `SELECT AsGeoJSON(geom) AS geom_json FROM paths WHERE id = ${pathId};`,
  );

  if (rows.length === 0) return [];

  const coords: [number, number, number][] = JSON.parse(rows[0].geom_json).coordinates;
  const profile: { distance: number; elevation: number }[] = [];
  let cumulative = 0;

  for (let i = 0; i < coords.length; i++) {
    if (i > 0) {
      const [lng1, lat1] = coords[i - 1];
      const [lng2, lat2] = coords[i];
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLng = (lng2 - lng1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLng / 2) ** 2;
      cumulative += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    profile.push({
      distance: Math.round(cumulative),
      elevation: coords[i][2],
    });
  }

  return profile;
}
