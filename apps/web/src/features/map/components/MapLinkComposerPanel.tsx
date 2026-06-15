import { resolveMapPointLinkRef } from "@/lib/map/map-point-link-ref";
import { cn } from "@/lib/utils";
import type { MapPointRecord } from "@/types/map/map-points";
import { Link2, Route, Trash2 } from "lucide-react";
import type { useLinkRoutePlanner } from "@/features/map/hooks/useLinkRoutePlanner";

type MapLinkComposerPanelProps = {
  mapPoints: MapPointRecord[];
  linkChain: number[];
  pathSlug: string;
  onPathSlugChange: (value: string) => void;
  onAppendToChain: (pointId: number) => void;
  onRemoveFromChain: (index: number) => void;
  onClearChain: () => void;
  onSaveSegments: () => void;
  isSaving?: boolean;
  routePlanner: ReturnType<typeof useLinkRoutePlanner>;
};

export function MapLinkComposerPanel({
  mapPoints,
  linkChain,
  pathSlug,
  onPathSlugChange,
  onAppendToChain,
  onRemoveFromChain,
  onClearChain,
  onSaveSegments,
  isSaving = false,
  routePlanner,
}: MapLinkComposerPanelProps) {
  const pointsById = new Map(mapPoints.map((point) => [point.id, point]));

  return (
    <div className="space-y-4 p-3" data-test="link-composer-panel">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-info" />
          <h2 className="text-sm font-semibold">Link composer</h2>
        </div>
        <p className="text-xs text-base-content/55">
          Ctrl/Cmd+click the map to add a marker, or Ctrl/Cmd+click existing markers to build a
          chain. Turn on Add marker (P) to place markers with a normal click.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-base-content/70" htmlFor="path-slug">
          Path slug
        </label>
        <input
          id="path-slug"
          className="input-bordered input input-sm w-full"
          value={pathSlug}
          onChange={(event) => onPathSlugChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">
            Chain ({linkChain.length})
          </h3>
          {linkChain.length > 0 ? (
            <button type="button" className="btn btn-ghost btn-xs" onClick={onClearChain}>
              Clear
            </button>
          ) : null}
        </div>
        {linkChain.length === 0 ? (
          <p className="text-xs text-base-content/50">No markers in chain yet.</p>
        ) : (
          <ol className="space-y-1">
            {linkChain.map((pointId, index) => {
              const point = pointsById.get(pointId);
              return (
                <li
                  key={`${pointId}-${index}`}
                  className="flex items-center justify-between rounded-md border border-base-content/10 px-2 py-1 text-sm"
                >
                  <span>
                    {index + 1}. {point ? resolveMapPointLinkRef(point) : pointId}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onRemoveFromChain(index)}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <button
          type="button"
          className="btn w-full btn-sm btn-primary"
          disabled={linkChain.length < 2 || isSaving}
          onClick={onSaveSegments}
        >
          Save segment edges
        </button>
      </div>

      <div className="space-y-2 border-t border-base-content/10 pt-3">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-success" />
          <h3 className="text-sm font-semibold">Route planner</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["start", "end", "via"] as const).map((target) => (
            <button
              key={target}
              type="button"
              className={cn(
                "btn btn-xs",
                routePlanner.pickTarget === target ? "btn-primary" : "btn-outline",
              )}
              onClick={() =>
                routePlanner.setPickTarget(routePlanner.pickTarget === target ? null : target)
              }
            >
              Pick {target}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-xs" onClick={routePlanner.clear}>
            Reset
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
          <dt className="text-base-content/50">Start</dt>
          <dd>
            {routePlanner.startId
              ? resolveMapPointLinkRef(
                  pointsById.get(routePlanner.startId) ?? {
                    id: routePlanner.startId,
                    ref: null,
                    name: null,
                  },
                )
              : "—"}
          </dd>
          <dt className="text-base-content/50">End</dt>
          <dd>
            {routePlanner.endId
              ? resolveMapPointLinkRef(
                  pointsById.get(routePlanner.endId) ?? {
                    id: routePlanner.endId,
                    ref: null,
                    name: null,
                  },
                )
              : "—"}
          </dd>
          <dt className="text-base-content/50">Via</dt>
          <dd>
            {routePlanner.viaIds.length > 0
              ? routePlanner.viaIds
                  .map((id) =>
                    resolveMapPointLinkRef(pointsById.get(id) ?? { id, ref: null, name: null }),
                  )
                  .join(", ")
              : "—"}
          </dd>
        </dl>
        <button
          type="button"
          className="btn w-full btn-outline btn-sm"
          onClick={routePlanner.calculatePath}
        >
          Calculate route
        </button>
        {routePlanner.liveAnalysis?.merged.found ? (
          <p className="text-xs text-success">
            Path found: {routePlanner.liveAnalysis.merged.pointIds.length} markers,{" "}
            {routePlanner.liveAnalysis.merged.totalDistanceMeters.toFixed(0)} m
          </p>
        ) : null}
      </div>

      <div className="max-h-40 overflow-auto rounded-md border border-base-content/10">
        <table className="table table-xs">
          <thead>
            <tr>
              <th>Marker</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {mapPoints.map((point) => (
              <tr key={point.id}>
                <td>{resolveMapPointLinkRef(point)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onAppendToChain(point.id)}
                    disabled={linkChain.includes(point.id)}
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
