export type RoutingGraphSeedPointProperties = {
  id: number;
  mapId: number;
  ref: string | null;
  name: string | null;
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
  points: {
    type: "FeatureCollection";
    features: RoutingGraphSeedPointFeature[];
  };
  neighbors: RoutingGraphSeedNeighbor[];
};
