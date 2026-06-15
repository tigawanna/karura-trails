import { parsePointMetadata } from "@/geo/point-record";

export const MARKER_SYNC_OPT_OUT_KEY = "syncOptOut";

export function readMarkerSyncOptOut(metadataJson: string | null | undefined): boolean {
  const metadata = parsePointMetadata(metadataJson);
  return metadata[MARKER_SYNC_OPT_OUT_KEY] === "true";
}

export function writeMarkerSyncOptOut(
  metadataJson: string | null | undefined,
  optOut: boolean,
): string {
  const metadata = parsePointMetadata(metadataJson);
  if (optOut) {
    metadata[MARKER_SYNC_OPT_OUT_KEY] = "true";
  } else {
    delete metadata[MARKER_SYNC_OPT_OUT_KEY];
  }
  return JSON.stringify(metadata);
}
