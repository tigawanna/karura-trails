import { parsePointMetadata } from "@/geo/point-record";
import type { PointSelect } from "@/lib/drizzle/schema/points";

function parsePointCoordinates(geom: string | null): { longitude: number; latitude: number } | null {
  if (!geom) {
    return null;
  }

  try {
    const parsed = JSON.parse(geom) as { coordinates?: unknown };
    const coordinates = parsed.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }
    const longitude = coordinates[0];
    const latitude = coordinates[1];
    if (typeof longitude !== "number" || typeof latitude !== "number") {
      return null;
    }
    return { longitude, latitude };
  } catch {
    return null;
  }
}

export function buildMapPointSyncPayload(point: PointSelect): Record<string, unknown> {
  const coordinates = parsePointCoordinates(point.geom);
  if (!coordinates) {
    throw new Error("Marker geometry is missing or invalid.");
  }

  const pointMetadata = parsePointMetadata(point.metadataJson);
  const metadata: Record<string, string> = {
    markerKind: point.markerKind ?? "physical",
    sourceMarkerId: String(point.id),
    capturedOnDevice: "true",
    ...pointMetadata,
  };

  if (point.photoUri) {
    metadata.photoUri = point.photoUri;
  }
  if (point.secondaryPhotoUri) {
    metadata.secondaryPhotoUri = point.secondaryPhotoUri;
  }

  return {
    sourceMarkerId: point.id,
    ref: point.ref,
    name: point.name,
    category: point.category ?? "custom",
    nodeRole: point.nodeRole,
    longitude: coordinates.longitude,
    latitude: coordinates.latitude,
    elevation: point.elevation,
    elevationSource: point.elevationSource,
    description: point.description,
    parentRef: point.parentRef,
    sortOrder: point.sortOrder,
    metadata,
    createdAt: point.createdAt,
    updatedAt: point.updatedAt,
  };
}
