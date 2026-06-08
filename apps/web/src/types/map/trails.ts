export type TrailMetadata = Record<string, string>;

export type TrailRecord = {
  id: number;
  mapId: number;
  slug: string;
  name: string | null;
  kind: string;
  color: string | null;
  status: string;
  metadata: TrailMetadata;
  createdAt: string;
  updatedAt: string;
};

export type TrailMemberRecord = {
  id: number;
  trailId: number;
  segmentEdgeId: number;
  orderIndex: number;
  direction: string;
  createdAt: string;
  updatedAt: string;
};
