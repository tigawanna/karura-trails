import type { SyncEventRecord } from "@/types/sync";
import { create } from "zustand";

export type SyncActivityStatus = "idle" | "syncing" | "error";

type SyncActivityState = {
  status: SyncActivityStatus;
  currentPage: number;
  totalPages: number;
  perPage: number;
  totalCount: number;
  remainingCount: number;
  eventsProcessed: number;
  eventsApplied: number;
  lastError: string | null;
  lastSyncedAt: string | null;
  upstreamEvents: SyncEventRecord[];
  triggerSync: (() => Promise<void>) | null;
  startSync: () => void;
  updateProgress: (input: {
    currentPage: number;
    totalPages: number;
    perPage: number;
    totalCount: number;
    remainingCount: number;
    batchEvents: SyncEventRecord[];
    batchApplied: number;
    eventsProcessed: number;
    eventsApplied: number;
  }) => void;
  finishSync: () => void;
  setError: (message: string) => void;
  registerTrigger: (trigger: (() => Promise<void>) | null) => void;
  requestSyncNow: () => Promise<void>;
};

export const useSyncActivityStore = create<SyncActivityState>((set, get) => ({
  status: "idle",
  currentPage: 0,
  totalPages: 0,
  perPage: 0,
  totalCount: 0,
  remainingCount: 0,
  eventsProcessed: 0,
  eventsApplied: 0,
  lastError: null,
  lastSyncedAt: null,
  upstreamEvents: [],
  triggerSync: null,
  startSync: () =>
    set({
      status: "syncing",
      currentPage: 0,
      totalPages: 0,
      perPage: 0,
      totalCount: 0,
      remainingCount: 0,
      eventsProcessed: 0,
      eventsApplied: 0,
      lastError: null,
      upstreamEvents: [],
    }),
  updateProgress: (input) =>
    set((state) => ({
      status: "syncing",
      currentPage: input.currentPage,
      totalPages: input.totalPages,
      perPage: input.perPage,
      totalCount: input.totalCount,
      remainingCount: input.remainingCount,
      eventsProcessed: input.eventsProcessed,
      eventsApplied: input.eventsApplied,
      upstreamEvents: [...input.batchEvents, ...state.upstreamEvents].slice(0, 500),
    })),
  finishSync: () =>
    set({
      status: "idle",
      lastSyncedAt: new Date().toISOString(),
    }),
  setError: (message) =>
    set({
      status: "error",
      lastError: message,
    }),
  registerTrigger: (trigger) => set({ triggerSync: trigger }),
  requestSyncNow: async () => {
    await get().triggerSync?.();
  },
}));
