export type MarkerRenameProposal = {
  pointId: number;
  anchorRef: string;
  kind: "physical" | "virtual" | "landmark";
  beforeRef: string | null;
  beforeName: string | null;
  afterRef: string;
  afterName: string;
  afterParentRef: string | null;
  afterSortOrder: number;
  reason: string;
  neighborLabels: string[];
  category: string;
  latitude: number;
  longitude: number;
};

export type MarkerRenamePlan = {
  mapId: number;
  anchorCount: number;
  proposalCount: number;
  unchangedCount: number;
  proposals: MarkerRenameProposal[];
};

export type MarkerRenameInventoryEntry = {
  id: number;
  ref: string | null;
  name: string | null;
  category: string;
  kind: "physical" | "virtual" | "landmark";
  parentRef: string | null;
  sortOrder: number;
  latitude: number;
  longitude: number;
  description: string | null;
  neighborLabels: string[];
};

export type PhysicalAnchorSpurLegExport = {
  anchorId: number;
  anchorLabel: string;
  towardId: number | null;
  towardLabel: string | null;
  markerLabelsCsv: string;
};

export type MarkerRenameInventoryExport = {
  version: 1;
  exportedAt: string;
  mapId: number;
  mapName: string;
  physicalMarkerSpurs?: PhysicalAnchorSpurLegExport[];
  spurReportText?: string;
  markers: MarkerRenameInventoryEntry[];
  proposals: Array<{
    pointId: number;
    beforeRef: string | null;
    beforeName: string | null;
    afterRef: string;
    afterName: string;
    reason: string;
    approved?: boolean;
  }>;
};

export type MarkerRenameApplyInput = {
  pointId: number;
  ref: string;
  name: string;
  parentRef: string | null;
  sortOrder: number;
};
