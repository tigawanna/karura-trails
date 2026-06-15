import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventReviewMapPreview } from "@/features/sync/components/EventReviewMapPreview";
import type { EventMapPreview } from "@/lib/sync/event-map-preview";
import type { VerifySyncEventChanges } from "@/types/sync";
import { useEffect, useMemo, useState } from "react";

export type SyncEventReviewEditValues = {
  name: string;
  latitude: number;
  longitude: number;
};

type SyncEventReviewEditDialogProps = {
  open: boolean;
  preview: EventMapPreview;
  emphasisPointId: string | null;
  initialValues: SyncEventReviewEditValues;
  originalValues: SyncEventReviewEditValues;
  onClose: () => void;
  onApprove: (changes: VerifySyncEventChanges) => void;
  isPending?: boolean;
};

export function SyncEventReviewEditDialog({
  open,
  preview,
  emphasisPointId,
  initialValues,
  originalValues,
  onClose,
  onApprove,
  isPending = false,
}: SyncEventReviewEditDialogProps) {
  const [name, setName] = useState(initialValues.name);
  const [latitude, setLatitude] = useState(initialValues.latitude);
  const [longitude, setLongitude] = useState(initialValues.longitude);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(initialValues.name);
    setLatitude(initialValues.latitude);
    setLongitude(initialValues.longitude);
  }, [initialValues, open]);

  const mapPreview = useMemo<EventMapPreview>(() => {
    if (!emphasisPointId) {
      return preview;
    }
    return {
      ...preview,
      points: preview.points.map((point) =>
        point.id === emphasisPointId
          ? { ...point, latitude, longitude, label: name || point.label }
          : point,
      ),
    };
  }, [emphasisPointId, latitude, longitude, name, preview]);

  const changes = useMemo<VerifySyncEventChanges>(() => {
    const next: VerifySyncEventChanges = {};
    if (name !== originalValues.name) {
      next.name = name.trim() ? name.trim() : null;
    }
    if (Math.abs(latitude - originalValues.latitude) > 1e-7) {
      next.latitude = latitude;
    }
    if (Math.abs(longitude - originalValues.longitude) > 1e-7) {
      next.longitude = longitude;
    }
    return next;
  }, [latitude, longitude, name, originalValues]);

  const hasChanges = Object.keys(changes).length > 0;

  if (!open) {
    return null;
  }

  return (
    <dialog className="modal-open modal" open>
      <div className="modal-box flex max-h-[90svh] w-full max-w-3xl flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Edit before approval</h3>
          <p className="mt-1 text-sm text-base-content/60">
            Adjust the marker name or position, then approve with your changes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="sync-event-name">Name</Label>
            <Input
              id="sync-event-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sync-event-latitude">Latitude</Label>
            <Input
              id="sync-event-latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(event) => setLatitude(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="sync-event-longitude">Longitude</Label>
            <Input
              id="sync-event-longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(event) => setLongitude(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="min-h-[280px] flex-1">
          <EventReviewMapPreview
            preview={mapPreview}
            viewportKey={emphasisPointId ? `edit-${emphasisPointId}` : "edit"}
            draggablePointId={emphasisPointId}
            onPointMove={(_pointId, nextLatitude, nextLongitude) => {
              setLatitude(nextLatitude);
              setLongitude(nextLongitude);
            }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !hasChanges}
            onClick={() => onApprove(changes)}
          >
            {isPending ? "Approving…" : "Approve with changes"}
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
