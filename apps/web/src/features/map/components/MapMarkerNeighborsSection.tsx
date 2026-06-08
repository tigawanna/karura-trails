import { getUndirectedNeighborIds } from "@/lib/map/neighbor-graph";
import { resolveMapPointLinkRef } from "@/lib/map/map-point-link-ref";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import type { MapPointRecord } from "@/types/map/map-points";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

type MapMarkerNeighborsSectionProps = {
  point: MapPointRecord;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  onReplaceNeighbors: (toMarkerIds: number[]) => void;
  isSaving?: boolean;
};

export function MapMarkerNeighborsSection({
  point,
  mapPoints,
  markerNeighbors,
  onReplaceNeighbors,
  isSaving = false,
}: MapMarkerNeighborsSectionProps) {
  const [addTargetId, setAddTargetId] = useState<number | "">("");

  const neighborIds = useMemo(
    () => getUndirectedNeighborIds(markerNeighbors, point.id),
    [markerNeighbors, point.id],
  );

  const candidates = useMemo(
    () => mapPoints.filter((entry) => entry.id !== point.id && !neighborIds.includes(entry.id)),
    [mapPoints, neighborIds, point.id],
  );

  function removeNeighbor(neighborId: number) {
    onReplaceNeighbors(neighborIds.filter((id) => id !== neighborId));
  }

  function addNeighbor() {
    if (addTargetId === "" || neighborIds.includes(addTargetId)) {
      return;
    }
    onReplaceNeighbors([...neighborIds, addTargetId]);
    setAddTargetId("");
  }

  return (
    <div className="space-y-2 border-t border-base-content/10 pt-3">
      <h4 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">
        Neighbors
      </h4>
      {neighborIds.length === 0 ? (
        <p className="text-xs text-base-content/50">No neighbor links yet.</p>
      ) : (
        <ul className="space-y-1">
          {neighborIds.map((neighborId) => {
            const neighbor = mapPoints.find((entry) => entry.id === neighborId);
            return (
              <li
                key={neighborId}
                className="flex items-center justify-between rounded-md border border-base-content/10 px-2 py-1 text-sm"
              >
                <span>{neighbor ? resolveMapPointLinkRef(neighbor) : neighborId}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={isSaving}
                  onClick={() => removeNeighbor(neighborId)}
                >
                  <X className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-2">
        <select
          className="select-bordered select min-w-0 flex-1 select-sm"
          value={addTargetId}
          onChange={(event) => setAddTargetId(event.target.value ? Number(event.target.value) : "")}
        >
          <option value="">Add neighbor…</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {resolveMapPointLinkRef(candidate)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={addTargetId === "" || isSaving}
          onClick={addNeighbor}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
