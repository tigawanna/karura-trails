import { parseSyncEventPayload } from "@/services/sync/sync.api";
import type { MapPointRecord } from "@/types/map/map-points";
import type { SyncEventRecord } from "@/types/sync";

export type EventMapPreviewPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  emphasis?: boolean;
};

export type EventMapPreviewEdge = {
  id: string;
  from: EventMapPreviewPoint;
  to: EventMapPreviewPoint;
};

export type EventMapPreview = {
  points: EventMapPreviewPoint[];
  edges: EventMapPreviewEdge[];
  summary: string;
};

function pointFromPayload(
  id: string,
  payload: Record<string, unknown>,
  label: string,
  emphasis = false,
): EventMapPreviewPoint | null {
  const latitude = payload.latitude;
  const longitude = payload.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  return { id, latitude, longitude, label, emphasis };
}

function findPointBySourceMarkerId(
  mapPoints: MapPointRecord[],
  sourceMarkerId: unknown,
): EventMapPreviewPoint | null {
  const needle = String(sourceMarkerId);
  const match = mapPoints.find((point) => point.metadata?.sourceMarkerId === needle);
  if (!match) {
    return null;
  }
  return {
    id: `local-${match.id}`,
    latitude: match.latitude,
    longitude: match.longitude,
    label: match.name ?? match.ref ?? `Point ${match.id}`,
  };
}

export function buildEventMapPreview(
  event: SyncEventRecord,
  mapPoints: MapPointRecord[] = [],
): EventMapPreview {
  const payload = parseSyncEventPayload(event);
  const points: EventMapPreviewPoint[] = [];
  const edges: EventMapPreviewEdge[] = [];

  if (event.tableName === "map_point") {
    const point = pointFromPayload(
      event.id,
      payload,
      payload.name?.toString() ?? "Map point",
      true,
    );
    if (point) {
      points.push(point);
    }
    return {
      points,
      edges,
      summary: `${event.action} map point`,
    };
  }

  if (event.tableName === "marker_neighbor" && event.action === "create") {
    const from =
      pointFromPayload(
        "from",
        { latitude: payload.fromLatitude, longitude: payload.fromLongitude },
        "From",
      ) ?? findPointBySourceMarkerId(mapPoints, payload.fromSourceMarkerId);
    const to =
      pointFromPayload(
        "to",
        { latitude: payload.toLatitude, longitude: payload.toLongitude },
        "To",
      ) ?? findPointBySourceMarkerId(mapPoints, payload.toSourceMarkerId);

    if (from) {
      points.push({ ...from, emphasis: true });
    }
    if (to) {
      points.push({ ...to, emphasis: true });
    }
    if (from && to) {
      edges.push({ id: event.id, from, to });
    }

    return {
      points,
      edges,
      summary: "Neighbor link",
    };
  }

  if (event.tableName === "map" && event.action === "update") {
    const center = pointFromPayload(
      "center",
      {
        latitude: payload.mapCenterLat,
        longitude: payload.mapCenterLng,
      },
      payload.name?.toString() ?? "Map center",
      true,
    );
    if (center) {
      points.push(center);
    }
    return {
      points,
      edges,
      summary: "Map update",
    };
  }

  return {
    points,
    edges,
    summary: `${event.action} ${event.tableName}`,
  };
}
