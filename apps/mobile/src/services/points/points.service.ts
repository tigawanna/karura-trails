import { db } from "@/lib/drizzle/client";
import { points, type PointCategory, type PointSelect } from "@/lib/drizzle/schema";
import { recordPointSyncEvent } from "@/lib/sync/outbound-sync-events";
import type { ElevationSource } from "@/services/elevation/elevation.service";
import { inferElevationAtPoint } from "@/services/elevation/elevation.service";

export interface CreateMarkerInput {
  lng: number;
  lat: number;
  category: PointCategory;
  name: string | null;
  description: string | null;
  elevation: number | null;
  elevationSource: ElevationSource | null;
  photoUri: string | null;
  secondaryPhotoUri: string | null;
}

export interface MarkerDraftCoordinates {
  lng: number;
  lat: number;
  gpsAltitude: number | null;
}

export function resolveMarkerElevation(coordinates: MarkerDraftCoordinates): {
  elevation: number | null;
  elevationSource: ElevationSource | null;
} {
  const inferred = inferElevationAtPoint(coordinates.lng, coordinates.lat);

  if (
    coordinates.gpsAltitude != null &&
    Number.isFinite(coordinates.gpsAltitude) &&
    (inferred == null || inferred.distanceToPath > 25)
  ) {
    return {
      elevation: Math.round(coordinates.gpsAltitude),
      elevationSource: "gps",
    };
  }

  if (inferred) {
    return {
      elevation: Math.round(inferred.elevation),
      elevationSource: inferred.source,
    };
  }

  if (coordinates.gpsAltitude != null && Number.isFinite(coordinates.gpsAltitude)) {
    return {
      elevation: Math.round(coordinates.gpsAltitude),
      elevationSource: "gps",
    };
  }

  return { elevation: null, elevationSource: null };
}

function buildPointGeometry(lng: number, lat: number, elevation: number | null): string {
  const coordinates =
    elevation != null
      ? [lng, lat, elevation]
      : ([lng, lat] as [number, number] | [number, number, number]);
  return JSON.stringify({
    type: "Point",
    coordinates,
  });
}

export async function createMarker(input: CreateMarkerInput): Promise<PointSelect> {
  const now = new Date().toISOString();

  const [created] = await db
    .insert(points)
    .values({
      name: input.name,
      description: input.description,
      category: input.category,
      photoUri: input.photoUri,
      secondaryPhotoUri: input.secondaryPhotoUri,
      elevation: input.elevation,
      elevationSource: input.elevationSource,
      geom: buildPointGeometry(input.lng, input.lat, input.elevation),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to save marker");
  }

  await recordPointSyncEvent(created, "create");

  return created;
}
