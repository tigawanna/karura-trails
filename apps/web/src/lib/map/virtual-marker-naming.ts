import { haversineDistanceMeters } from "@/lib/map/geo";

const PHYSICAL_REF_PATTERN = /^(\d+)([a-z])?$/;
const VIRTUAL_REF_PATTERN = /^(\d+(?:[a-z])?)\.(\d+)$/;

export type MapPointNamingSource = {
  id: number;
  ref: string | null;
  name: string | null;
  parentRef?: string | null;
  sortOrder?: number;
  metadata?: Record<string, string>;
};

export type MapPointPlacementSource = MapPointNamingSource & {
  latitude: number;
  longitude: number;
};

export type MarkerKind = "physical" | "virtual" | "landmark";

export const DEFAULT_ANCHOR_SEARCH_METERS = 150;

export function resolveMarkerKind(point: MapPointNamingSource): MarkerKind {
  const metadataKind = point.metadata?.markerKind?.trim();
  if (metadataKind === "physical" || metadataKind === "virtual" || metadataKind === "landmark") {
    return metadataKind;
  }

  const label = resolveMapPointLabel(point);
  if (isVirtualRef(label) || point.parentRef?.trim()) {
    return "virtual";
  }

  if (label && inferLegacyAnchorRef(label) && !isPhysicalRef(label)) {
    return "virtual";
  }

  if (isPhysicalMapPoint(point)) {
    return "physical";
  }

  return "landmark";
}

export function inferLegacyAnchorRef(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }

  const virtual = parseVirtualRef(trimmed);
  if (virtual) {
    return virtual.anchorRef;
  }

  const legacyLetterNum = trimmed.match(/^(\d+(?:[a-z]?))\.[a-z]\d+/);
  if (legacyLetterNum?.[1]) {
    return legacyLetterNum[1];
  }

  const dotLetter = trimmed.match(/^(\d+(?:[a-z]?))\.[a-z](?:\d+|-\w+)?$/i);
  if (dotLetter?.[1]) {
    return dotLetter[1];
  }

  const dotted = trimmed.match(/^(\d+(?:[a-z]?))\./);
  if (dotted?.[1]) {
    return dotted[1];
  }

  return null;
}

export function isPhysicalRef(ref: string): boolean {
  return PHYSICAL_REF_PATTERN.test(ref);
}

export function isVirtualRef(ref: string): boolean {
  return VIRTUAL_REF_PATTERN.test(ref);
}

export function formatVirtualRef(anchorRef: string, sequence: number): string {
  return `${anchorRef}.${sequence}`;
}

export function parseVirtualRef(ref: string): { anchorRef: string; sequence: number } | null {
  const match = ref.match(VIRTUAL_REF_PATTERN);
  if (!match?.[1] || match[2] === undefined) {
    return null;
  }
  return { anchorRef: match[1], sequence: Number(match[2]) };
}

export function resolveMapPointLabel(point: MapPointNamingSource): string {
  return point.ref?.trim() || point.name?.trim() || "";
}

export function isPhysicalMapPoint(point: MapPointNamingSource): boolean {
  const label = resolveMapPointLabel(point);
  if (!label) {
    return false;
  }
  return isPhysicalRef(label) && !isVirtualRef(label);
}

export function resolveAnchorRefFromHead(head: MapPointNamingSource): string | null {
  const label = resolveMapPointLabel(head);
  if (label) {
    const parsed = parseVirtualRef(label);
    if (parsed) {
      return parsed.anchorRef;
    }
    if (isPhysicalRef(label)) {
      return label;
    }
  }
  const parentRef = head.parentRef?.trim();
  return parentRef || null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveVirtualSequenceFromLabel(label: string, anchorRef: string): number | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseVirtualRef(trimmed);
  if (parsed?.anchorRef === anchorRef) {
    return parsed.sequence;
  }

  const anchorPattern = escapeRegex(anchorRef);
  const legacyMatch = trimmed.match(new RegExp(`^${anchorPattern}\\.a(\\d+)`, "i"));
  if (legacyMatch?.[1]) {
    return Number(legacyMatch[1]);
  }

  const dottedMatch = trimmed.match(new RegExp(`^${anchorPattern}\\.(\\d+)\\b`));
  if (dottedMatch?.[1]) {
    return Number(dottedMatch[1]);
  }

  return null;
}

function resolveVirtualSequenceFromPoint(
  point: MapPointNamingSource,
  anchorRef: string,
): number | null {
  const label = resolveMapPointLabel(point);
  const fromLabel = label ? resolveVirtualSequenceFromLabel(label, anchorRef) : null;
  if (fromLabel !== null) {
    return fromLabel;
  }

  const parentRef = point.parentRef?.trim();
  if (parentRef === anchorRef && point.sortOrder != null && point.sortOrder > 0) {
    return point.sortOrder;
  }

  return null;
}

export function nextVirtualSequence(
  anchorRef: string,
  points: MapPointNamingSource[],
  excludePointId?: number,
): number {
  let maxSequence = 0;

  for (const point of points) {
    if (excludePointId !== undefined && point.id === excludePointId) {
      continue;
    }

    const sequence = resolveVirtualSequenceFromPoint(point, anchorRef);
    if (sequence !== null) {
      maxSequence = Math.max(maxSequence, sequence);
    }
  }

  return maxSequence + 1;
}

export function resolveAnchorRefFromNearbyPoint(point: MapPointNamingSource): string | null {
  const fromHead = resolveAnchorRefFromHead(point);
  if (fromHead) {
    return fromHead;
  }

  const parentRef = point.parentRef?.trim();
  if (parentRef && isPhysicalRef(parentRef)) {
    return parentRef;
  }

  if (isPhysicalMapPoint(point)) {
    const physicalLabel = resolveMapPointLabel(point);
    if (physicalLabel && isPhysicalRef(physicalLabel)) {
      return physicalLabel;
    }
  }

  return null;
}

export function resolveAnchorRefNearCapture(input: {
  latitude: number;
  longitude: number;
  allPoints: MapPointPlacementSource[];
  maxDistanceMeters?: number;
}): string | null {
  const maxDistanceMeters = input.maxDistanceMeters ?? DEFAULT_ANCHOR_SEARCH_METERS;
  let best: { anchorRef: string; distanceMeters: number } | null = null;

  for (const point of input.allPoints) {
    const distanceMeters = haversineDistanceMeters(
      input.latitude,
      input.longitude,
      point.latitude,
      point.longitude,
    );
    if (distanceMeters > maxDistanceMeters) {
      continue;
    }

    const anchorRef = resolveAnchorRefFromNearbyPoint(point);
    if (!anchorRef) {
      continue;
    }

    if (!best || distanceMeters < best.distanceMeters) {
      best = { anchorRef, distanceMeters };
    }
  }

  return best?.anchorRef ?? null;
}

export function suggestVirtualMarkerRefForPlacement(input: {
  latitude: number;
  longitude: number;
  allPoints: MapPointPlacementSource[];
  maxDistanceMeters?: number;
}): { ref: string; parentRef: string; name: string } | null {
  const anchorRef = resolveAnchorRefNearCapture(input);
  if (!anchorRef) {
    return null;
  }

  const sequence = nextVirtualSequence(anchorRef, input.allPoints);
  const ref = formatVirtualRef(anchorRef, sequence);
  return { ref, parentRef: anchorRef, name: ref };
}

export function suggestNextVirtualMarkerRef(input: {
  headPoint: MapPointNamingSource;
  allPoints: MapPointNamingSource[];
}): { ref: string; parentRef: string; name: string } | null {
  const anchorRef = resolveAnchorRefFromHead(input.headPoint);
  if (!anchorRef) {
    return null;
  }

  const sequence = nextVirtualSequence(anchorRef, input.allPoints);
  const ref = formatVirtualRef(anchorRef, sequence);
  return { ref, parentRef: anchorRef, name: ref };
}

export function resolveCreateMapPointRefFields(input: {
  name: string;
  ref?: string | null;
  parentRef?: string | null;
}): { ref: string | null; name: string | null; parentRef: string | null } {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return { ref: null, name: null, parentRef: null };
  }

  const explicitRef = input.ref?.trim();
  if (explicitRef) {
    const parsed = parseVirtualRef(explicitRef);
    return {
      ref: explicitRef,
      name: trimmedName,
      parentRef: input.parentRef?.trim() || parsed?.anchorRef || null,
    };
  }

  if (isPhysicalRef(trimmedName)) {
    return { ref: trimmedName, name: trimmedName, parentRef: null };
  }

  if (isVirtualRef(trimmedName)) {
    const parsed = parseVirtualRef(trimmedName);
    return {
      ref: trimmedName,
      name: trimmedName,
      parentRef: input.parentRef?.trim() || parsed?.anchorRef || null,
    };
  }

  return {
    ref: null,
    name: trimmedName,
    parentRef: input.parentRef?.trim() || null,
  };
}
