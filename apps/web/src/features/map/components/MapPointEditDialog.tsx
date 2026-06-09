import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveMarkerKind } from "@/lib/map/virtual-marker-naming";
import {
  MAP_POINT_CATEGORIES,
  type MapPointCategory,
  type MapPointRecord,
} from "@/types/map/map-points";
import { useEffect, useState } from "react";

type MapPointEditDialogProps = {
  point: MapPointRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (values: {
    ref: string;
    name: string;
    category: MapPointCategory;
    description: string;
    elevation: string;
    isVirtual: boolean;
  }) => void;
  onDelete?: () => void;
  isSaving?: boolean;
};

export function MapPointEditDialog({
  point,
  open,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
}: MapPointEditDialogProps) {
  const [ref, setRef] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MapPointCategory>("custom");
  const [description, setDescription] = useState("");
  const [elevation, setElevation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);

  useEffect(() => {
    if (!point) {
      return;
    }
    setRef(point.ref ?? "");
    setName(point.name ?? "");
    setCategory(point.category);
    setDescription(point.description ?? "");
    setElevation(point.elevation != null ? String(point.elevation) : "");
    setIsVirtual(resolveMarkerKind(point) === "virtual");
  }, [point]);

  if (!open || !point) {
    return null;
  }

  return (
    <dialog className="modal-open modal" open>
      <div className="modal-box max-w-lg">
        <h3 className="text-lg font-semibold">Edit marker</h3>
        <p className="mt-1 text-sm text-base-content/60">
          {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
        </p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="point-ref">Reference</Label>
            <Input id="point-ref" value={ref} onChange={(event) => setRef(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="point-name">Name</Label>
            <Input id="point-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="point-category">Category</Label>
            <select
              id="point-category"
              className="select-bordered select w-full"
              value={category}
              onChange={(event) => setCategory(event.target.value as MapPointCategory)}
            >
              {MAP_POINT_CATEGORIES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="point-elevation">Elevation (m)</Label>
            <Input
              id="point-elevation"
              value={elevation}
              onChange={(event) => setElevation(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="point-description">Description</Label>
            <textarea
              id="point-description"
              className="textarea-bordered textarea w-full"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-base-300 px-3 py-2.5">
            <input
              type="checkbox"
              className="checkbox mt-0.5 checkbox-sm"
              checked={isVirtual}
              onChange={(event) => setIsVirtual(event.target.checked)}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Virtual marker</span>
              <span className="block text-xs text-base-content/60">
                Virtual markers support anchor refs like 12.3 and can be hidden from the map view.
              </span>
            </span>
          </label>
        </div>
        <div className="mt-6 flex items-center justify-between gap-2">
          {onDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isSaving}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onSave({ ref, name, category, description, elevation, isVirtual })}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
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
