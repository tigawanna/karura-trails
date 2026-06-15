import { mergeMarkerCategoryMetadata, serializeMarkerCategories } from "@/geo/marker-categories";
import { writeMarkerSyncOptOut } from "@/geo/marker-sync";
import { getTableColumns, sql } from "drizzle-orm";

import { db } from "@/lib/drizzle/client";
import { points, syncEvents, type PointCategory, type PointSelect } from "@/lib/drizzle/schema";
import { recordPointSyncEvent } from "@/lib/sync/outbound-sync-events";
import type { ElevationSource } from "@/services/elevation/elevation.service";
import { inferElevationAtPoint } from "@/services/elevation/elevation.service";
import { deleteMarker } from "@/services/points/delete-marker";
import { assertMarkerNameIsAvailable } from "@/services/points/marker-name-availability";

export interface CreateMarkerInput {
  lng: number;
  lat: number;
  categories: PointCategory[];
  name: string | null;
  description: string | null;
  elevation: number | null;
  elevationSource: ElevationSource | null;
  photoUri: string | null;
  secondaryPhotoUri: string | null;
  syncToServer?: boolean;
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
  await assertMarkerNameIsAvailable(input.name);

  const now = new Date().toISOString();

  const pointReturning = {
    ...getTableColumns(points),
    geom: sql<string>`AsGeoJSON(${points.geom})`.as("geom"),
  };

  const { category, metadataJson: categoryMetadata } = serializeMarkerCategories(input.categories);
  const metadataJson = writeMarkerSyncOptOut(categoryMetadata, input.syncToServer === false);

  const [created] = await db
    .insert(points)
    .values({
      name: input.name,
      description: input.description,
      category,
      metadataJson,
      photoUri: input.photoUri,
      secondaryPhotoUri: input.secondaryPhotoUri,
      elevation: input.elevation,
      elevationSource: input.elevationSource,
      geom: buildPointGeometry(input.lng, input.lat, input.elevation),
      createdAt: now,
      updatedAt: now,
    })
    .returning(pointReturning);

  if (!created) {
    throw new Error("Failed to save marker");
  }

  if (input.syncToServer !== false) {
    await recordPointSyncEvent(created, "create");
  }

  return created;
}
