export const pgliteQueryKeys = {
  map: (mapId: number) => ["pglite", "map", mapId] as const,
  mapPoints: (mapId: number) => ["pglite", "mapPoints", mapId] as const,
  geoSegments: (mapId: number) => ["pglite", "geoSegments", mapId] as const,
  markerNeighbors: (mapId: number) => ["pglite", "markerNeighbors", mapId] as const,
  segmentEdges: (mapId: number) => ["pglite", "segmentEdges", mapId] as const,
  trails: (mapId: number) => ["pglite", "trails", mapId] as const,
  localEvents: () => ["pglite", "localEvents"] as const,
  karuraMapId: () => ["pglite", "karuraMapId"] as const,
};
