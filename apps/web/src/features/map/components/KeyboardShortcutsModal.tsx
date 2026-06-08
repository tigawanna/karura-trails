import { formatForDisplay } from "@tanstack/react-hotkeys";
import { X } from "lucide-react";
import { useKeyboardShortcutsStore } from "@/features/map/shortcuts/keyboard-shortcuts-store";
import { getCatalogEntriesForCategory, MAP_TIP_ITEMS } from "@/lib/shortcuts/catalog";
import {
  MAP_POINT_DEAD_END_RING,
  MAP_POINT_NATURAL_ENDPOINT_RING,
} from "@/lib/map/map-point-marker-appearance";
import type { MapTipItem, ShortcutCategory, ShortcutDefinition } from "@/lib/shortcuts/types";
import { SHORTCUT_CATEGORIES } from "@/lib/shortcuts/types";

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  global: "Global",
  mapWorkspace: "Map workspace",
  mapTips: "Map tips",
};

function MapTipSwatch({ variant }: { variant: NonNullable<MapTipItem["swatch"]> }) {
  if (variant === "green-diamond") {
    return (
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center" aria-hidden>
        <span className="size-2.5 rotate-45 border-2 border-[#22c55e] bg-base-100" />
      </span>
    );
  }

  if (variant === "teal-endpoint") {
    return (
      <span
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 bg-base-100"
        style={{ borderColor: MAP_POINT_NATURAL_ENDPOINT_RING }}
        aria-hidden
      >
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: MAP_POINT_NATURAL_ENDPOINT_RING }}
        />
      </span>
    );
  }

  if (variant === "purple-dead-end") {
    return (
      <span
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 bg-base-100 text-[9px] leading-none font-bold"
        style={{ borderColor: MAP_POINT_DEAD_END_RING, color: MAP_POINT_DEAD_END_RING }}
        aria-hidden
      >
        ×
      </span>
    );
  }

  if (variant === "amber-glow") {
    return (
      <span
        className="mt-0.5 size-3 shrink-0 rounded-full border-2 border-[#f59e0b] bg-base-100"
        style={{ boxShadow: "0 0 0 3px rgba(245,158,11,0.45)" }}
        aria-hidden
      />
    );
  }

  return (
    <span className="mt-1 flex h-3 w-4 shrink-0 items-center justify-center" aria-hidden>
      <span
        className="relative h-0.5 w-full"
        style={{
          background: "repeating-linear-gradient(90deg, #6366f1 0 3px, transparent 3px 6px)",
        }}
      />
    </span>
  );
}

function formatShortcutKeys(definitions: ShortcutDefinition[]): string {
  const keys = definitions.map((entry) => formatForDisplay(entry.hotkey));
  return [...new Set(keys)].join(" · ");
}

function ShortcutGroup({
  category,
  entries,
}: {
  category: ShortcutCategory;
  entries: ShortcutDefinition[];
}) {
  if (entries.length === 0) {
    return null;
  }

  const rows = new Map<string, ShortcutDefinition[]>();
  for (const entry of entries) {
    const existing = rows.get(entry.label) ?? [];
    existing.push(entry);
    rows.set(entry.label, existing);
  }

  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
        {CATEGORY_LABELS[category]}
      </h3>
      <ul className="mt-2 divide-y divide-base-300/80">
        {[...rows.entries()].map(([label, rowEntries]) => (
          <li key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span className="min-w-0 text-base-content/90">{label}</span>
            <kbd className="kbd shrink-0 font-mono text-xs kbd-sm">
              {formatShortcutKeys(rowEntries)}
            </kbd>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MapTipsSection() {
  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
        Tips & tricks
      </h3>
      <ul className="mt-2 space-y-2 text-sm text-base-content/75">
        {MAP_TIP_ITEMS.map((item) => (
          <li key={item.label} className="flex gap-2.5 leading-snug">
            {item.swatch ? (
              <MapTipSwatch variant={item.swatch} />
            ) : (
              <span className="mt-2 size-1 shrink-0 rounded-full bg-base-content/35" aria-hidden />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KeyboardShortcutsModal() {
  const open = useKeyboardShortcutsStore((state) => state.open);
  const setOpen = useKeyboardShortcutsStore((state) => state.setOpen);

  if (!open) {
    return null;
  }

  const mapWorkspaceEntries = getCatalogEntriesForCategory("mapWorkspace");
  const mapTipsEntries = getCatalogEntriesForCategory("mapTips");

  return (
    <div className="modal-open modal z-[1400]">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close keyboard shortcuts"
        onClick={() => setOpen(false)}
      />
      <div className="modal-box flex max-h-[min(36rem,85vh)] max-w-lg flex-col gap-0 p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">Keyboard shortcuts</h2>
            <p className="mt-1 text-sm text-base-content/60">
              Press <kbd className="kbd kbd-sm">Shift</kbd> + <kbd className="kbd kbd-sm">?</kbd>{" "}
              anytime on the map to open this dialog.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-circle shrink-0 btn-ghost btn-sm"
            onClick={() => setOpen(false)}
            aria-label="Close keyboard shortcuts"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-4">
          {SHORTCUT_CATEGORIES.filter((category) => category !== "mapTips").map((category) => (
            <ShortcutGroup
              key={category}
              category={category}
              entries={
                category === "mapWorkspace"
                  ? mapWorkspaceEntries
                  : getCatalogEntriesForCategory(category)
              }
            />
          ))}
          {mapTipsEntries.length > 0 ? (
            <ShortcutGroup category="mapTips" entries={mapTipsEntries} />
          ) : null}
          <MapTipsSection />
        </div>
      </div>
    </div>
  );
}
