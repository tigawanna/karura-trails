import {
  markerHasNeighborLinks,
  markerIsDeadEnd,
  markerIsNaturalEndpoint,
} from "@/lib/map/marker-neighbor-coverage";

export const MAP_POINT_DEAD_END_RING = "#9333ea";
export const MAP_POINT_NATURAL_ENDPOINT_RING = "#14b8a6";

export type MapPointMarkerAppearanceInput = {
  pointId: number;
  selected: boolean;
  linkMode: boolean;
  inChain: boolean;
  isLinkHead: boolean;
  isSuggestion: boolean;
  showNeighborCoverage: boolean;
  markerIdsWithNeighborLinks: ReadonlySet<number>;
  deadEndMarkerIds: ReadonlySet<number>;
  naturalEndpointMarkerIds: ReadonlySet<number>;
};

function linkModeHighlightActive(input: MapPointMarkerAppearanceInput): boolean {
  return input.linkMode && (input.inChain || input.isLinkHead || input.isSuggestion);
}

export function resolveMapPointMarkerRing(input: MapPointMarkerAppearanceInput): string {
  if (input.linkMode) {
    if (input.isLinkHead) {
      return "#f59e0b";
    }
    if (input.inChain) {
      return "#0ea5e9";
    }
    if (input.isSuggestion) {
      return "#22c55e";
    }
  }

  if (input.selected) {
    return "#2563eb";
  }

  if (input.showNeighborCoverage) {
    if (markerIsNaturalEndpoint(input.pointId, input.naturalEndpointMarkerIds)) {
      return MAP_POINT_NATURAL_ENDPOINT_RING;
    }
    if (markerIsDeadEnd(input.pointId, input.deadEndMarkerIds)) {
      return MAP_POINT_DEAD_END_RING;
    }
    if (markerHasNeighborLinks(input.pointId, input.markerIdsWithNeighborLinks)) {
      return "#22c55e";
    }
    return "#f59e0b";
  }

  return "#ffffff";
}

export function resolveMapPointMarkerHalo(
  ring: string,
  input: MapPointMarkerAppearanceInput,
): string {
  if (linkModeHighlightActive(input)) {
    return `box-shadow:0 0 0 4px ${ring}55;`;
  }

  if (
    input.showNeighborCoverage &&
    markerIsNaturalEndpoint(input.pointId, input.naturalEndpointMarkerIds) &&
    !input.selected
  ) {
    return "box-shadow:0 0 0 4px rgba(20,184,166,0.4);";
  }

  if (
    input.showNeighborCoverage &&
    markerIsDeadEnd(input.pointId, input.deadEndMarkerIds) &&
    !input.selected
  ) {
    return "box-shadow:0 0 0 5px rgba(147,51,234,0.45);";
  }

  if (
    input.showNeighborCoverage &&
    !markerHasNeighborLinks(input.pointId, input.markerIdsWithNeighborLinks) &&
    !input.selected
  ) {
    return "box-shadow:0 0 0 5px rgba(245,158,11,0.45);";
  }

  if (
    input.showNeighborCoverage &&
    markerHasNeighborLinks(input.pointId, input.markerIdsWithNeighborLinks)
  ) {
    return "box-shadow:0 0 0 3px rgba(34,197,94,0.35);";
  }

  return "box-shadow:0 1px 3px rgba(0,0,0,0.4);";
}

export function resolveMapPointMarkerIsNaturalEndpoint(
  input: MapPointMarkerAppearanceInput,
): boolean {
  if (
    !input.showNeighborCoverage ||
    !markerIsNaturalEndpoint(input.pointId, input.naturalEndpointMarkerIds)
  ) {
    return false;
  }
  return !linkModeHighlightActive(input);
}

export function resolveMapPointMarkerIsDeadEnd(input: MapPointMarkerAppearanceInput): boolean {
  if (!input.showNeighborCoverage || !markerIsDeadEnd(input.pointId, input.deadEndMarkerIds)) {
    return false;
  }
  return !linkModeHighlightActive(input);
}

type MapPointMarkerPinMarkupInput = {
  pinSize: number;
  pinOffset: number;
  ring: string;
  fillColor: string;
  halo: string;
  isDeadEnd: boolean;
  isNaturalEndpoint: boolean;
  label: string;
  linkMode: boolean;
  markerCursor: string;
};

export function buildMapPointMarkerPinMarkup(input: MapPointMarkerPinMarkupInput): string {
  const labelMarkup = input.label
    ? `<span style="transform:translateY(-1px);font-size:${input.linkMode ? 11 : 10}px;font-weight:700;color:#0f172a;background:rgba(255,255,255,0.9);border-radius:4px;padding:0 4px;white-space:nowrap;">${input.label}</span>`
    : "";

  let pinMarkup: string;
  if (input.isNaturalEndpoint) {
    const dotSize = Math.max(5, Math.round(input.pinSize * 0.34));
    pinMarkup = `<div style="width:${input.pinSize}px;height:${input.pinSize}px;border-radius:9999px;border:2px solid ${input.ring};background:#ffffff;${input.halo};display:flex;align-items:center;justify-content:center;"><span style="width:${dotSize}px;height:${dotSize}px;border-radius:9999px;background:${input.ring};"></span></div>`;
  } else if (input.isDeadEnd) {
    pinMarkup = `<div style="width:${input.pinSize}px;height:${input.pinSize}px;border-radius:9999px;border:2px solid ${input.ring};background:#ffffff;${input.halo};display:flex;align-items:center;justify-content:center;"><span style="font-size:${Math.max(11, Math.round(input.pinSize * 0.52))}px;font-weight:800;color:${input.ring};line-height:1;">×</span></div>`;
  } else {
    pinMarkup = `<div style="width:${input.pinSize}px;height:${input.pinSize}px;transform:rotate(45deg);border:2px solid ${input.ring};background:${input.fillColor};${input.halo}"></div>`;
  }

  return `<div style="margin-left:${input.pinOffset}px;margin-top:${input.pinOffset}px;display:flex;align-items:center;gap:4px;cursor:${input.markerCursor};">${pinMarkup}${labelMarkup}</div>`;
}
