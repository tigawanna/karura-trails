export type MarkerKind = "physical" | "virtual" | "landmark";

export type MarkerKindSource = {
  ref: string | null;
  name: string | null;
  parentRef?: string | null;
  metadata?: Record<string, string>;
};

const PHYSICAL_REF_PATTERN = /^(\d+)([a-z])?$/;
const VIRTUAL_REF_PATTERN = /^(\d+(?:[a-z])?)\.(\d+)$/;

function resolveLabel(point: MarkerKindSource): string {
  return point.ref?.trim() || point.name?.trim() || "";
}

function isGuidepostMetadata(metadata: Record<string, string> | undefined): boolean {
  const data = metadata ?? {};
  return data.type === "Guidepost" || data.class === "visitor_amenities";
}

function isPhysicalRef(ref: string): boolean {
  return PHYSICAL_REF_PATTERN.test(ref);
}

function isVirtualRef(ref: string): boolean {
  return VIRTUAL_REF_PATTERN.test(ref);
}

function inferLegacyAnchorRef(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }

  const virtual = trimmed.match(VIRTUAL_REF_PATTERN);
  if (virtual?.[1]) {
    return virtual[1];
  }

  const legacyLetterNum = trimmed.match(/^(\d+(?:[a-z]?))\.[a-z]\d+/);
  if (legacyLetterNum?.[1]) {
    return legacyLetterNum[1];
  }

  const dotLetter = trimmed.match(/^(\d+(?:[a-z]?))\.[a-z](?:\d+|-b)?$/);
  if (dotLetter?.[1]) {
    return dotLetter[1];
  }

  const dotted = trimmed.match(/^(\d+(?:[a-z]?))\./);
  if (dotted?.[1]) {
    return dotted[1];
  }

  return null;
}

function isPhysicalMapPoint(point: MarkerKindSource): boolean {
  if (isGuidepostMetadata(point.metadata)) {
    return true;
  }

  const label = resolveLabel(point);
  if (!label) {
    return false;
  }

  return isPhysicalRef(label) && !isVirtualRef(label);
}

export function resolveMarkerKind(
  point: MarkerKindSource & { markerKind?: string | null },
): MarkerKind {
  const metadataKind = point.markerKind?.trim() || point.metadata?.markerKind?.trim();
  if (metadataKind === "physical" || metadataKind === "virtual" || metadataKind === "landmark") {
    return metadataKind;
  }

  const label = resolveLabel(point);
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

export function isGroundedMarkerKind(kind: MarkerKind): boolean {
  return kind === "physical" || kind === "landmark";
}
