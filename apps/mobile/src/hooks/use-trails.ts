import { useQuery } from "@tanstack/react-query";

import { executeQuerySync } from "@/db/client";
import type { PathSelect } from "@/db/schema";

interface TrailWithGeometry extends Omit<PathSelect, "geom"> {
  geom: string;
}

function fetchAllTrails(): TrailWithGeometry[] {
  return executeQuerySync<TrailWithGeometry>(
    `SELECT id, slug, name, description, source, difficulty, surface_type,
            is_loop, distance_meters, elevation_gain, elevation_loss,
            min_elevation, max_elevation, vertex_count,
            AsGeoJSON(geom) as geom,
            created_at, updated_at
     FROM paths
     ORDER BY name;`,
  );
}

function fetchTrailBySlug(slug: string): TrailWithGeometry | undefined {
  const rows = executeQuerySync<TrailWithGeometry>(
    `SELECT id, slug, name, description, source, difficulty, surface_type,
            is_loop, distance_meters, elevation_gain, elevation_loss,
            min_elevation, max_elevation, vertex_count,
            AsGeoJSON(geom) as geom,
            created_at, updated_at
     FROM paths
     WHERE slug = '${slug}'
     LIMIT 1;`,
  );
  return rows[0];
}

export function useTrails() {
  return useQuery({
    queryKey: ["trails"],
    queryFn: () => fetchAllTrails(),
  });
}

export function useTrailBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["trail", slug],
    queryFn: () => fetchTrailBySlug(slug!),
    enabled: !!slug,
  });
}
