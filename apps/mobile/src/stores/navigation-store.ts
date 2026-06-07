import { create } from "zustand";

export type NavigationStoreState = {
  fromPointId: number | null;
  toPointId: number | null;
  viaPointIds: number[];
  blockedPointIds: number[];
  routePointIds: number[];
  distanceMeters: number;
};

export type NavigationStoreActions = {
  clearNavigation: () => void;
  setFromPointId: (pointId: number | null) => void;
  setToPointId: (pointId: number | null) => void;
  beginNavigation: (input: {
    fromPointId: number;
    toPointId: number;
    viaPointIds?: number[];
    blockedPointIds?: number[];
  }) => void;
  navigateToInstead: (pointId: number) => void;
  routeThroughHere: (pointId: number) => void;
  removeFromRoute: (pointId: number) => void;
  removeViaPoint: (pointId: number) => void;
  unblockPoint: (pointId: number) => void;
  applyRouteResult: (input: { pointIds: number[]; distanceMeters: number }) => void;
};

export type NavigationStore = NavigationStoreState & NavigationStoreActions;

const initialState: NavigationStoreState = {
  fromPointId: null,
  toPointId: null,
  viaPointIds: [],
  blockedPointIds: [],
  routePointIds: [],
  distanceMeters: 0,
};

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  ...initialState,

  clearNavigation: () => set({ ...initialState }),

  setFromPointId: (pointId) => set({ fromPointId: pointId }),

  setToPointId: (pointId) => set({ toPointId: pointId }),

  beginNavigation: (input) =>
    set({
      fromPointId: input.fromPointId,
      toPointId: input.toPointId,
      viaPointIds: input.viaPointIds ?? [],
      blockedPointIds: input.blockedPointIds ?? [],
      routePointIds: [],
      distanceMeters: 0,
    }),

  navigateToInstead: (pointId) => {
    const state = get();
    if (state.toPointId === pointId) {
      return;
    }
    set({
      toPointId: pointId,
      viaPointIds: state.viaPointIds.filter((id) => id !== pointId),
      blockedPointIds: state.blockedPointIds.filter((id) => id !== pointId),
    });
  },

  routeThroughHere: (pointId) => {
    const state = get();
    if (pointId === state.fromPointId || pointId === state.toPointId) {
      return;
    }
    if (state.viaPointIds.includes(pointId)) {
      return;
    }
    set({
      viaPointIds: [...state.viaPointIds, pointId],
      blockedPointIds: state.blockedPointIds.filter((id) => id !== pointId),
    });
  },

  removeFromRoute: (pointId) => {
    const state = get();
    if (pointId === state.fromPointId || pointId === state.toPointId) {
      return;
    }
    set({
      viaPointIds: state.viaPointIds.filter((id) => id !== pointId),
      blockedPointIds: state.blockedPointIds.includes(pointId)
        ? state.blockedPointIds
        : [...state.blockedPointIds, pointId],
    });
  },

  removeViaPoint: (pointId) => {
    set((state) => ({
      viaPointIds: state.viaPointIds.filter((id) => id !== pointId),
    }));
  },

  unblockPoint: (pointId) => {
    set((state) => ({
      blockedPointIds: state.blockedPointIds.filter((id) => id !== pointId),
    }));
  },

  applyRouteResult: (input) =>
    set((state) => {
      const samePath =
        state.routePointIds.length === input.pointIds.length &&
        state.routePointIds.every((id, index) => id === input.pointIds[index]);
      if (samePath && state.distanceMeters === input.distanceMeters) {
        return state;
      }
      return {
        routePointIds: input.pointIds,
        distanceMeters: input.distanceMeters,
      };
    }),
}));

export function selectIsNavigating(state: NavigationStoreState): boolean {
  return state.routePointIds.length > 1;
}

export function selectRoutePointIdSet(state: NavigationStoreState): Set<number> {
  return new Set(state.routePointIds);
}
