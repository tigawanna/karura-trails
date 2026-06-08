import {
  buildSegmentsFromPathMutationOptions,
  previewBuildSegmentsFromPath,
} from "@/data-access-layer/pglite/segment-edges";
import { groupSegmentsByPath } from "@/lib/map/group-segments-by-path";
import type { PgliteDb } from "@/lib/pglite/client";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

type SegmentBuildFromPathPanelProps = {
  db: PgliteDb;
  mapId: number;
  geoSegments: GeoSegmentRecord[];
  pathSlug?: string;
  onPathSlugChange?: (pathSlug: string) => void;
  onStatusMessage?: (message: string | null) => void;
  onBuilt?: () => void;
  showPathSelect?: boolean;
};

export function SegmentBuildFromPathPanel({
  db,
  mapId,
  geoSegments,
  pathSlug,
  onPathSlugChange,
  onStatusMessage,
  onBuilt,
  showPathSelect = false,
}: SegmentBuildFromPathPanelProps) {
  const pathGroups = groupSegmentsByPath(geoSegments);
  const [localPathSlug, setLocalPathSlug] = useState(pathGroups[0]?.groupId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const buildSegments = useMutation({
    ...buildSegmentsFromPathMutationOptions(db, mapId),
    onSuccess: (result) => {
      reportStatus(`Built ${result.created.length} segment edge(s) for ${result.pathSlug}.`);
      onBuilt?.();
    },
    onError: (error) => {
      reportStatus(error instanceof Error ? error.message : String(error));
    },
  });

  const activeSlug = pathSlug || localPathSlug || pathGroups[0]?.groupId || "";

  function reportStatus(text: string | null) {
    setMessage(text);
    onStatusMessage?.(text);
  }

  async function handlePreview() {
    if (!activeSlug) {
      return;
    }
    reportStatus(null);
    setIsPreviewing(true);
    try {
      const preview = await previewBuildSegmentsFromPath(db, {
        mapId,
        pathSlug: activeSlug,
        maxProjectionDistanceMeters: 40,
      });
      if (preview.proposed.length === 0) {
        reportStatus("No segment edges would be created for this path.");
        return;
      }
      reportStatus(preview.proposed.map((edge) => `${edge.fromRef}→${edge.toRef}`).join(", "));
    } catch (caught: unknown) {
      reportStatus(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsPreviewing(false);
    }
  }

  if (pathGroups.length === 0) {
    return <p className="text-sm text-base-content/55">Import trail segments before building.</p>;
  }

  return (
    <div className="space-y-3" data-test="segment-build-from-path">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Build segments from path</p>
        <p className="text-xs text-base-content/60">
          Projects routing-node markers onto the trail polyline and creates segment edges along the
          path.
        </p>
      </div>
      {showPathSelect ? (
        <label className="form-control gap-1">
          <span className="label-text text-xs">Path</span>
          <select
            className="select-bordered select w-full select-sm font-mono"
            value={activeSlug}
            onChange={(event) => {
              setLocalPathSlug(event.target.value);
              onPathSlugChange?.(event.target.value);
            }}
          >
            {pathGroups.map((path) => (
              <option key={path.groupId} value={path.groupId}>
                {path.groupId}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={isPreviewing}
          onClick={() => void handlePreview()}
        >
          Preview
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={buildSegments.isPending}
          onClick={() =>
            buildSegments.mutate({
              pathSlug: activeSlug,
              replaceExisting: true,
              maxProjectionDistanceMeters: 40,
            })
          }
          data-test="segment-build-from-path-run"
        >
          Build segments
        </button>
      </div>
      {message ? <p className="text-xs text-base-content/70">{message}</p> : null}
    </div>
  );
}
