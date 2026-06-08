import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applySelectedInsertBetweenToDraft,
  type InsertBetweenEdgeSelection,
  type MapMarkerSaveDraft,
} from "@/features/map/lib/map-marker-save-draft";
import { cn } from "@/lib/utils";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import type { MapPointRecord } from "@/types/map/map-points";
import { useEffect, useState } from "react";

type MapMarkerCaptureDialogProps = {
  draft: MapMarkerSaveDraft | null;
  mapPoints: MapPointRecord[];
  geoSegments: GeoSegmentRecord[];
  open: boolean;
  onClose: () => void;
  onSave: (draft: MapMarkerSaveDraft) => void;
  isSaving?: boolean;
};

function edgeSelectionKey(selection: InsertBetweenEdgeSelection): string {
  return `${selection.fromMarkerId}:${selection.toMarkerId}`;
}

export function MapMarkerCaptureDialog({
  draft,
  mapPoints,
  geoSegments,
  open,
  onClose,
  onSave,
  isSaving = false,
}: MapMarkerCaptureDialogProps) {
  const [workingDraft, setWorkingDraft] = useState<MapMarkerSaveDraft | null>(null);
  const [name, setName] = useState("");
  const [ref, setRef] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBetweenKey, setSelectedBetweenKey] = useState<string | null>(null);
  const [rewireNeighbors, setRewireNeighbors] = useState(true);

  useEffect(() => {
    if (!draft) {
      setWorkingDraft(null);
      return;
    }
    setWorkingDraft(draft);
    setName(draft.name);
    setRef(draft.ref?.trim() ?? "");
    setDescription(draft.description?.trim() ?? "");
    setSelectedBetweenKey(draft.insertBetween ? edgeSelectionKey(draft.insertBetween) : null);
    setRewireNeighbors(true);
  }, [draft]);

  if (!open || !draft || !workingDraft) {
    return null;
  }

  const betweenCandidates = workingDraft.insertBetweenCandidates ?? [];

  function handleSelectBetween(selection: InsertBetweenEdgeSelection) {
    if (!workingDraft) {
      return;
    }
    const nextDraft = applySelectedInsertBetweenToDraft(
      workingDraft,
      selection,
      mapPoints,
      geoSegments,
    );
    setWorkingDraft(nextDraft);
    setName(nextDraft.name);
    setRef(nextDraft.ref?.trim() ?? "");
    setDescription(nextDraft.description?.trim() ?? "");
    setSelectedBetweenKey(edgeSelectionKey(selection));
    setRewireNeighbors(true);
  }

  function handleSkipBetween() {
    if (!workingDraft) {
      return;
    }
    setWorkingDraft({
      ...workingDraft,
      insertBetween: null,
    });
    setSelectedBetweenKey(null);
    setRewireNeighbors(false);
  }

  function handleSave() {
    const currentDraft = workingDraft;
    if (!currentDraft) {
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const shouldRewire =
      rewireNeighbors && selectedBetweenKey !== null && currentDraft.insertBetween != null;

    onSave({
      ...currentDraft,
      name: trimmedName,
      ref: ref.trim() || null,
      description: description.trim() || null,
      insertBetween: shouldRewire ? currentDraft.insertBetween : null,
    });
  }

  return (
    <dialog className="modal-open modal" open data-test="map-marker-capture-dialog">
      <div className="modal-box max-w-lg">
        <h3 className="text-lg font-semibold">New marker</h3>
        <p className="mt-1 text-sm text-base-content/60">
          {draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}
        </p>

        <div className="mt-4 space-y-4">
          {betweenCandidates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-base-content/60">Insert between markers</p>
              <p className="text-xs text-base-content/50">
                Pick the linked pair this marker sits between, or skip if the guess is wrong.
              </p>
              <ul className="space-y-1.5">
                {betweenCandidates.map((candidate) => {
                  const key = edgeSelectionKey(candidate);
                  const selected = selectedBetweenKey === key;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left text-xs transition-colors",
                          selected
                            ? "border-primary/40 bg-primary/10"
                            : "border-base-content/10 hover:bg-base-200/50",
                        )}
                        onClick={() => handleSelectBetween(candidate)}
                      >
                        <span className="font-mono font-semibold">
                          {candidate.fromRef} → {candidate.toRef}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {selectedBetweenKey ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={rewireNeighbors}
                    onChange={(event) => setRewireNeighbors(event.target.checked)}
                  />
                  <span className="text-xs text-base-content/70">Rewire neighbors on save</span>
                </label>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleSkipBetween}
                data-test="map-marker-insert-between-skip"
              >
                Not between these markers
              </button>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="capture-name">Name</Label>
            <Input
              id="capture-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              data-test="map-marker-capture-name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="capture-ref">Reference</Label>
            <Input
              id="capture-ref"
              value={ref}
              onChange={(event) => setRef(event.target.value)}
              placeholder="Optional virtual ref, e.g. 12.3"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="capture-description">Description</Label>
            <textarea
              id="capture-description"
              className="textarea-bordered textarea w-full"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        <div className="modal-action">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            data-test="map-marker-capture-save"
          >
            {isSaving ? "Saving…" : "Save marker"}
          </Button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
