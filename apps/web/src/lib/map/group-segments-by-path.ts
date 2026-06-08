import type { GeoSegmentRecord } from "@/types/map/geo-segments";

export type MapPathGroupSummary = {
  groupId: string;
  name: string | null;
  pathKind: string;
  segmentCount: number;
  pointCount: number;
  segmentIds: number[];
};

export function groupSegmentsByPath(segments: GeoSegmentRecord[]): MapPathGroupSummary[] {
  const groups = new Map<string, GeoSegmentRecord[]>();

  for (const segment of segments) {
    const existing = groups.get(segment.segmentGroupId) ?? [];
    existing.push(segment);
    groups.set(segment.segmentGroupId, existing);
  }

  return [...groups.entries()]
    .map(([groupId, groupSegments]) => {
      const sorted = [...groupSegments].sort((a, b) => a.segmentIndex - b.segmentIndex);
      const named = sorted.find((segment) => segment.name);
      const pointCount = sorted.reduce(
        (total, segment) => total + segment.geometryJson.coordinates.length,
        0,
      );

      return {
        groupId,
        name: named?.name ?? null,
        pathKind: sorted[0]?.pathKind ?? "unknown",
        segmentCount: sorted.length,
        pointCount,
        segmentIds: sorted.map((segment) => segment.id),
      };
    })
    .sort((a, b) => a.groupId.localeCompare(b.groupId));
}
