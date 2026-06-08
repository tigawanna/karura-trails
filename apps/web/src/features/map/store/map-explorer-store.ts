import type { MapDataExplorerSelection, MapDataExplorerTab } from "@/types/map/maps";
import { create } from "zustand";

type MapExplorerStore = {
  tab: MapDataExplorerTab;
  selection: MapDataExplorerSelection | null;
  editPointId: number | null;
  placementMode: boolean;
  showNeighborCoverage: boolean;
  showSegments: boolean;
  statusMessage: string | null;
  setTab: (tab: MapDataExplorerTab) => void;
  setSelection: (selection: MapDataExplorerSelection | null) => void;
  setEditPointId: (id: number | null) => void;
  setPlacementMode: (value: boolean) => void;
  setShowNeighborCoverage: (value: boolean) => void;
  setShowSegments: (value: boolean) => void;
  setStatusMessage: (message: string | null) => void;
  reset: () => void;
};

const initialState = {
  tab: "points" as MapDataExplorerTab,
  selection: null as MapDataExplorerSelection | null,
  editPointId: null as number | null,
  placementMode: false,
  showNeighborCoverage: true,
  showSegments: true,
  statusMessage: null as string | null,
};

export const useMapExplorerStore = create<MapExplorerStore>((set) => ({
  ...initialState,
  setTab: (tab) => set({ tab }),
  setSelection: (selection) => set({ selection }),
  setEditPointId: (editPointId) => set({ editPointId }),
  setPlacementMode: (placementMode) => set({ placementMode }),
  setShowNeighborCoverage: (showNeighborCoverage) => set({ showNeighborCoverage }),
  setShowSegments: (showSegments) => set({ showSegments }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  reset: () => set(initialState),
}));
