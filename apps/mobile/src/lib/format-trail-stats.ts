export function formatTrailDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) {
    return "—";
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatTrailElevation(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) {
    return "—";
  }
  return `${Math.round(meters)} m`;
}

export function formatDifficultyLabel(difficulty: string | null | undefined): string {
  if (!difficulty) {
    return "Unknown";
  }
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

export function formatSurfaceLabel(surface: string | null | undefined): string {
  if (!surface) {
    return "—";
  }
  return surface.charAt(0).toUpperCase() + surface.slice(1);
}
