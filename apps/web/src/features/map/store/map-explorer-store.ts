import type { MapDataExplorerSelection, MapDataExplorerTab } from "@/types/map/maps";
import { create } from "zustand";

type MapExplorerStore = {
  tab: MapDataExplorerTab;
  selection: MapDataExplorerSelection | null;
  editPointId: number | null;
  placementMode: boolean;
  linkMode: boolean;
  linkChain: number[];
  showNeighborCoverage: boolean;
  showSegments: boolean;
  statusMessage: string | null;
  setTab: (tab: MapDataExplorerTab) => void;
  setSelection: (selection: MapDataExplorerSelection | null) => void;
  setEditPointId: (id: number | null) => void;
  setPlacementMode: (value: boolean) => void;
  setLinkMode: (value: boolean) => void;
  setLinkChain: (chain: number[]) => void;
  appendLinkChainPoint: (pointId: number) => void;
  removeLinkChainPointAt: (index: number) => void;
  reorderLinkChain: (fromIndex: number, toIndex: number) => void;
  clearLinkChain: () => void;
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
  linkMode: false,
  linkChain: [] as number[],
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
  setLinkMode: (linkMode) => set({ linkMode }),
  setLinkChain: (linkChain) => set({ linkChain }),
  appendLinkChainPoint: (pointId) =>
    set((state) => {
      if (state.linkChain.includes(pointId)) {
        return state;
      }
      return { linkChain: [...state.linkChain, pointId] };
    }),
  removeLinkChainPointAt: (index) =>
    set((state) => ({
      linkChain: state.linkChain.filter((_, entryIndex) => entryIndex !== index),
    })),
  reorderLinkChain: (fromIndex, toIndex) =>
    set((state) => {
      const next = [...state.linkChain];
      const [moved] = next.splice(fromIndex, 1);
      if (moved === undefined) {
        return state;
      }
      next.splice(toIndex, 0, moved);
      return { linkChain: next };
    }),
  clearLinkChain: () => set({ linkChain: [] }),
  setShowNeighborCoverage: (showNeighborCoverage) => set({ showNeighborCoverage }),
  setShowSegments: (showSegments) => set({ showSegments }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  reset: () => set(initialState),
}));
