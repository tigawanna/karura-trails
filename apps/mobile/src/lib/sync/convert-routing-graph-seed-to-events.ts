import type { RoutingGraphSeedJson } from "@/geo/routing-graph-seed.types";
import type { PointCategory } from "@/lib/drizzle/schema";
import type { SyncEventPayload } from "@/lib/sync/sync.types";

export const KARURA_SEED_DEVICE_ID = "karura-desktop-export";

const VALID_CATEGORIES = new Set<PointCategory>([
  "junction",
  "gate",
  "bridge",
  "viewpoint",
  "water",
  "cave",
  "rest_area",
  "sign",
  "custom",
]);

const VALID_NODE_ROLES = new Set(["junction", "endpoint", "waypoint"]);

function createSyncEventId(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const random = Math.random().toString(16).slice(2, 14).padEnd(12, "0");
  return `019${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${timestamp.slice(12)}-${random.slice(0, 4)}-${random.slice(4)}`;
}

function normalizeCategory(value: string): PointCategory {
  if (VALID_CATEGORIES.has(value as PointCategory)) {
    return value as PointCategory;
  }
  return "custom";
}

function normalizeNodeRole(value: string | null): string | null {
  if (value && VALID_NODE_ROLES.has(value)) {
    return value;
  }
  return null;
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

export function convertRoutingGraphSeedToEvents(seed: RoutingGraphSeedJson): SyncEventPayload[] {
  const events: SyncEventPayload[] = [];
  const usedRefs = new Set<string>();
  const baseTime = seed.generatedAt || new Date().toISOString();

  const mapMeta = seed.maps?.[0];
  if (mapMeta) {
    events.push({
      id: createSyncEventId(),
      deviceId: KARURA_SEED_DEVICE_ID,
      table: "map",
      rowId: String(mapMeta.id),
      action: "update",
      payload: {
        sourceMapId: mapMeta.id,
        name: mapMeta.name,
        description: mapMeta.description,
        locationQuery: mapMeta.locationQuery,
        mapCenterLat: mapMeta.mapCenterLat,
        mapCenterLng: mapMeta.mapCenterLng,
        mapZoom: mapMeta.mapZoom,
      },
      createdAt: mapMeta.updatedAt || baseTime,
    });
  }

  for (const landmarkType of seed.landmarkTypes ?? []) {
    events.push({
      id: createSyncEventId(),
      deviceId: KARURA_SEED_DEVICE_ID,
      table: "landmark_type",
      rowId: String(landmarkType.id),
      action: "create",
      payload: {
        sourceLandmarkTypeId: landmarkType.id,
        sourceMapId: landmarkType.mapId,
        slug: landmarkType.slug,
        label: landmarkType.label,
        sortOrder: landmarkType.sortOrder,
        createdAt: landmarkType.createdAt,
        updatedAt: landmarkType.updatedAt,
      },
      createdAt: landmarkType.createdAt || baseTime,
    });
  }

  for (const feature of seed.points.features) {
    const properties = feature.properties;
    const [longitude, latitude, elevationFromGeometry] = feature.geometry.coordinates;
    const ref = resolveSeedRef(feature, usedRefs);
    const metadata = { ...properties.metadata };
    if (properties.markerKind) {
      metadata.markerKind = properties.markerKind;
    }
    metadata.sourceMarkerId = String(properties.id);

    events.push({
      id: createSyncEventId(),
      deviceId: KARURA_SEED_DEVICE_ID,
      table: "map_point",
      rowId: String(properties.id),
      action: "create",
      payload: {
        sourceMarkerId: properties.id,
        sourceMapId: properties.mapId,
        ref,
        name: properties.name,
        category: normalizeCategory(properties.category),
        nodeRole: normalizeNodeRole(properties.nodeRole),
        longitude,
        latitude,
        elevation: properties.elevation ?? elevationFromGeometry ?? null,
        elevationSource: properties.elevationSource,
        description: properties.description,
        parentRef: properties.parentRef,
        sortOrder: properties.sortOrder,
        metadata,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
      },
      createdAt: properties.createdAt || baseTime,
    });
  }

  for (const neighbor of seed.neighbors) {
    events.push({
      id: createSyncEventId(),
      deviceId: KARURA_SEED_DEVICE_ID,
      table: "marker_neighbor",
      rowId: `${neighbor.fromMarkerId}:${neighbor.toMarkerId}`,
      action: "create",
      payload: {
        sourceNeighborId: neighbor.id,
        sourceMapId: neighbor.mapId,
        fromSourceMarkerId: neighbor.fromMarkerId,
        toSourceMarkerId: neighbor.toMarkerId,
      },
      createdAt: baseTime,
    });
  }

  return events;
}
