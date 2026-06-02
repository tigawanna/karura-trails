import type { BoundingBox } from "@/geo/bbox";
import type { ParsedGeometry } from "@/geo/geojson";

export function geomParse(geomString: string | undefined): ParsedGeometry | undefined {
  if (!geomString) return undefined;
  try {
    return JSON.parse(geomString) as ParsedGeometry;
  } catch {
    return undefined;
  }
}

export function isValidLineString(
  geom: ParsedGeometry | undefined,
): geom is ParsedGeometry & { type: "LineString" } {
  if (!geom || geom.type !== "LineString") return false;
  return Array.isArray(geom.coordinates) && geom.coordinates.length >= 2;
}

export function isValidPoint(
  geom: ParsedGeometry | undefined,
): geom is ParsedGeometry & { type: "Point" } {
  if (!geom || geom.type !== "Point") return false;
  return Array.isArray(geom.coordinates) && geom.coordinates.length >= 2;
}

export function calculateBBox(geom: ParsedGeometry | undefined): BoundingBox | null {
  if (!geom?.coordinates) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const traverse = (coords: unknown[]): void => {
    for (const item of coords) {
      if (Array.isArray(item) && typeof item[0] === "number") {
        const [lng, lat] = item as number[];
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      } else if (Array.isArray(item)) {
        traverse(item);
      }
    }
  };

  traverse(geom.coordinates as unknown[]);

  if (!isFinite(minLng) || !isFinite(minLat) || !isFinite(maxLng) || !isFinite(maxLat)) {
    return null;
  }

  return { minLng, minLat, maxLng, maxLat };
}

export function combineBBoxes(boxes: (BoundingBox | null)[]): BoundingBox | null {
  const valid = boxes.filter((b): b is BoundingBox => b !== null);
  if (valid.length === 0) return null;

  return {
    minLng: Math.min(...valid.map((b) => b.minLng)),
    minLat: Math.min(...valid.map((b) => b.minLat)),
    maxLng: Math.max(...valid.map((b) => b.maxLng)),
    maxLat: Math.max(...valid.map((b) => b.maxLat)),
  };
}

export function bboxCenter(bbox: BoundingBox): [number, number] {
  return [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2];
}

export function bboxToZoom(bbox: BoundingBox): number {
  const latDelta = bbox.maxLat - bbox.minLat;
  const lngDelta = bbox.maxLng - bbox.minLng;
  const maxDelta = Math.max(latDelta, lngDelta);

  if (maxDelta > 2) return 6;
  if (maxDelta > 1) return 7;
  if (maxDelta > 0.5) return 8;
  if (maxDelta > 0.25) return 9;
  if (maxDelta > 0.1) return 10;
  if (maxDelta > 0.05) return 12;
  return 14;
}
