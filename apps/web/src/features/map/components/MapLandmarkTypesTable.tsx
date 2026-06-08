import {
  createMapLandmarkTypeMutationOptions,
  deleteMapLandmarkTypeMutationOptions,
} from "@/data-access-layer/pglite/map-landmark-types";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MapLandmarkTypeRecord } from "@/types/map/landmark-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type MapLandmarkTypesTableProps = {
  db: PgliteDb;
  mapId: number;
  landmarkTypes: MapLandmarkTypeRecord[];
};

export function MapLandmarkTypesTable({ db, mapId, landmarkTypes }: MapLandmarkTypesTableProps) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");

  const createMutation = useMutation({
    ...createMapLandmarkTypeMutationOptions(db, mapId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.landmarkTypes(mapId) });
      setLabel("");
      toast.success("Landmark type added.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add landmark type.");
    },
  });

  const deleteMutation = useMutation({
    ...deleteMapLandmarkTypeMutationOptions(db, mapId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.landmarkTypes(mapId) });
      toast.success("Landmark type removed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove landmark type.");
    },
  });

  function handleCreate() {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate({ label: trimmed });
  }

  return (
    <div className="space-y-3" data-test="map-landmark-types-explorer-table">
      <p className="text-xs text-base-content/55">
        Landmark types label marker categories for filtering and mobile display.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input-bordered input input-sm min-w-0 flex-1"
          value={label}
          placeholder="New landmark label…"
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleCreate();
            }
          }}
          data-test="landmark-type-create-input"
        />
        <button
          type="button"
          className="btn gap-1 btn-sm btn-primary"
          disabled={!label.trim() || createMutation.isPending}
          onClick={handleCreate}
          data-test="landmark-type-create-button"
        >
          <Plus className="size-3.5" />
          Add
        </button>
      </div>

      {landmarkTypes.length === 0 ? (
        <p className="px-1 py-6 text-sm text-base-content/55">No landmark types yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-content/10">
          <table className="table-pin-rows table table-sm">
            <thead>
              <tr className="text-base-content/50">
                <th className="min-w-40">Label</th>
                <th className="min-w-32">Slug</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {landmarkTypes.map((entry) => (
                <tr key={entry.id}>
                  <td className="align-top break-words whitespace-normal">{entry.label}</td>
                  <td className="align-top font-mono text-xs break-words whitespace-normal">
                    {entry.slug}
                  </td>
                  <td className="align-top">
                    <button
                      type="button"
                      className="btn btn-circle text-error btn-ghost btn-xs"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(entry.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
