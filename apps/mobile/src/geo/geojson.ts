export interface LineStringGeometry {
  type: "LineString";
  coordinates: [number, number, number][];
}

export interface PointGeometry {
  type: "Point";
  coordinates: [number, number, number] | [number, number];
}

export type TrailGeometry = LineStringGeometry | PointGeometry;

export interface TrailFeatureProperties {
  slug: string;
  name: string;
  source: string;
  geometrySource: string;
  vertexCount: number;
}

export interface TrailFeature {
  type: "Feature";
  id: string;
  properties: TrailFeatureProperties;
  geometry: LineStringGeometry;
}

export interface TrailFeatureCollection {
  type: "FeatureCollection";
  features: TrailFeature[];
}

export interface ParsedGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}
