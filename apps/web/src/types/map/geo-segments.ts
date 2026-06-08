export type StoredLineStringGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type GeoSegmentRecord = {
  id: number;
  mapId: number;
  segmentGroupId: string;
  segmentIndex: number;
  name: string | null;
  pathKind: string;
  status: string;
  coordinateSpace: string;
  geometryJson: StoredLineStringGeometry;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
};
