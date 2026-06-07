export type RoutingGraphSeedSpatialImport = {
  spatialReference: "EPSG:4326";
  geometryEncoding: "geojson";
  spatiaLite: {
    pointGeometryExpression: string;
    note: string;
  };
  postgis: {
    pointGeometryExpression: string;
    note: string;
  };
};

export type RoutingGraphSeedMapMeta = {
  id: number;
  name: string;
  description: string | null;
  locationQuery: string | null;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
  mapZoom: number | null;
  updatedAt: string;
};

export type RoutingGraphSeedMarkerKind = "physical" | "virtual" | "landmark";

export type RoutingGraphSeedLandmarkType = {
  id: number;
  mapId: number;
  slug: string;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RoutingGraphSeedPointProperties = {
  id: number;
  mapId: number;
  ref: string | null;
  name: string | null;
  markerKind?: RoutingGraphSeedMarkerKind;
  category: string;
  nodeRole: string | null;
  type: string;
  elevation: number | null;
  elevationSource: string | null;
  description: string | null;
  parentRef: string | null;
  sortOrder: number;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type RoutingGraphSeedPointFeature = {
  type: "Feature";
  id: string | number;
  geometry: {
    type: "Point";
    coordinates: [number, number] | [number, number, number];
  };
  properties: RoutingGraphSeedPointProperties;
};

export type RoutingGraphSeedNeighbor = {
  id: number;
  mapId: number;
  fromMarkerId: number;
  toMarkerId: number;
  fromRef: string | null;
  toRef: string | null;
};

export type RoutingGraphSeedJson = {
  version: number;
  format: "agentic-routing-graph-seed";
  generatedAt: string;
  bbox: [number, number, number, number] | null;
  spatialImport?: RoutingGraphSeedSpatialImport;
  maps?: RoutingGraphSeedMapMeta[];
  landmarkTypes?: RoutingGraphSeedLandmarkType[];
  points: {
    type: "FeatureCollection";
    features: RoutingGraphSeedPointFeature[];
  };
  neighbors: RoutingGraphSeedNeighbor[];
};
