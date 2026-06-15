import { applyMarkerRenamesMutationOptions } from "@/data-access-layer/pglite/apply-marker-renames";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import {
  buildMarkerRenameInventory,
  downloadMarkerRenameInventory,
  downloadSpurReportText,
  parseMarkerRenameInventory,
  proposalsFromInventory,
} from "@/features/map/lib/marker-rename-inventory";
import { useMapExplorerStore } from "@/features/map/store/map-explorer-store";
import { buildMarkerRenamePlan } from "@/lib/map/marker-rename-planner";
import {
  buildPhysicalMarkerSpurReport,
  formatPhysicalMarkerSpurReportText,
  type PhysicalMarkerSpurReport,
} from "@/lib/map/physical-marker-spur-report";
import { cn } from "@/lib/utils";
import type { PgliteDb } from "@/lib/pglite/client";
import type { MarkerRenameProposal } from "@/types/map/marker-rename";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCopy, Download, ListTree, RefreshCw, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "@/lib/ui/app-toast";

type MapMarkerRenamePanelProps = {
  db: PgliteDb;
  mapId: number;
  mapName: string;
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
};

type ProposalRowState = MarkerRenameProposal & {
  approved: boolean;
};

function proposalKey(proposal: Pick<MarkerRenameProposal, "pointId">): string {
  return String(proposal.pointId);
}

export function MapMarkerRenamePanel({
  db,
  mapId,
  mapName,
  mapPoints,
  markerNeighbors,
}: MapMarkerRenamePanelProps) {
  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const setSelection = useMapExplorerStore((state) => state.setSelection);
  const [rows, setRows] = useState<ProposalRowState[]>([]);
  const [summary, setSummary] = useState<{
    anchorCount: number;
    proposalCount: number;
    unchangedCount: number;
  } | null>(null);
  const [spurReport, setSpurReport] = useState<PhysicalMarkerSpurReport | null>(null);

  const applyMutation = useMutation({
    ...applyMarkerRenamesMutationOptions(db, mapId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.mapPoints(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.segmentEdges(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      setRows([]);
      setSummary(null);
      toast.success(
        `Renamed ${result.updatedPoints} marker(s) and updated ${result.updatedSegmentEdges} link ref(s).`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to apply renames.");
    },
  });

  const approvedCount = useMemo(() => rows.filter((row) => row.approved).length, [rows]);

  function handleBuildSpurReport() {
    const report = buildPhysicalMarkerSpurReport({
      mapId,
      mapPoints,
      markerNeighbors,
    });
    setSpurReport(report);
    if (report.physicalMarkers.length === 0) {
      toast.message(
        "No physical guidepost markers found. Mark junctions/gates as physical refs first.",
      );
    }
  }

  async function handleCopySpurReport() {
    if (!spurReport) {
      return;
    }
    const text = formatPhysicalMarkerSpurReportText(spurReport);
    await navigator.clipboard.writeText(text);
    toast.success("Spur report copied. Paste it into chat for rename help.");
  }

  function handleExportSpurReport() {
    if (!spurReport) {
      return;
    }
    downloadSpurReportText(
      `karura-spur-report-${mapId}.txt`,
      formatPhysicalMarkerSpurReportText(spurReport),
    );
  }

  function handleAnalyze() {
    const plan = buildMarkerRenamePlan({
      mapId,
      mapPoints,
      markerNeighbors,
    });
    setSummary({
      anchorCount: plan.anchorCount,
      proposalCount: plan.proposalCount,
      unchangedCount: plan.unchangedCount,
    });
    setRows(
      plan.proposals.map((proposal) => ({
        ...proposal,
        approved: true,
      })),
    );
  }

  function handleExport() {
    const inventory = buildMarkerRenameInventory({
      mapId,
      mapName,
      mapPoints,
      markerNeighbors,
      proposals: rows.length > 0 ? rows : undefined,
    });
    downloadMarkerRenameInventory(`karura-marker-rename-${mapId}.json`, inventory);
  }

  function handleImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== "string") {
          toast.error("Invalid JSON file.");
          return;
        }
        const inventory = parseMarkerRenameInventory(JSON.parse(reader.result) as unknown);
        const imported = proposalsFromInventory(inventory, mapPoints, markerNeighbors);
        setSummary({
          anchorCount: new Set(imported.map((entry) => entry.anchorRef)).size,
          proposalCount: imported.length,
          unchangedCount: mapPoints.length - imported.length,
        });
        setRows(
          imported.map((proposal) => {
            const approved =
              inventory.proposals.find((entry) => entry.pointId === proposal.pointId)?.approved ??
              true;
            return { ...proposal, approved };
          }),
        );
        toast.success(`Loaded ${imported.length} rename proposal(s).`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to import rename plan.");
      }
    };
    reader.readAsText(file);
  }

  function updateRow(
    pointId: number,
    patch: Partial<Pick<ProposalRowState, "afterRef" | "afterName" | "approved">>,
  ) {
    setRows((current) =>
      current.map((row) => (row.pointId === pointId ? { ...row, ...patch } : row)),
    );
  }

  function handleApplyApproved() {
    const approved = rows.filter((row) => row.approved);
    if (approved.length === 0) {
      toast.message("No proposals selected for approval.");
      return;
    }

    applyMutation.mutate(
      approved.map((row) => ({
        pointId: row.pointId,
        ref: row.afterRef,
        name: row.afterName,
        parentRef: row.afterParentRef,
        sortOrder: row.afterSortOrder,
      })),
    );
  }

  return (
    <div className="space-y-4" data-test="marker-rename-panel">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Marker rename review</p>
        <p className="text-xs text-base-content/60">
          Start with <strong>Build spur map</strong> to list every physical guidepost and the
          comma-separated markers on each leg until the next physical marker. Export or copy that
          report and paste it here in chat — then use <strong>Analyze naming</strong> to generate
          rename proposals you can approve and apply.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-accent"
          onClick={handleBuildSpurReport}
          data-test="marker-spur-report-build"
        >
          <ListTree className="size-3.5" />
          Build spur map
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={!spurReport}
          onClick={() => void handleCopySpurReport()}
        >
          <ClipboardCopy className="size-3.5" />
          Copy spur report
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={!spurReport}
          onClick={handleExportSpurReport}
        >
          <Download className="size-3.5" />
          Export spur .txt
        </button>
      </div>

      {spurReport ? (
        <div className="space-y-2 rounded-box border border-base-content/10 bg-base-200/30 p-3">
          <p className="text-xs font-medium text-base-content/70">
            Physical markers ({spurReport.physicalMarkers.length}):{" "}
            {spurReport.physicalMarkers.map((entry) => entry.label).join(", ") || "(none)"}
          </p>
          <pre className="max-h-64 overflow-auto font-mono text-[11px] whitespace-pre-wrap text-base-content/80">
            {formatPhysicalMarkerSpurReportText(spurReport)}
          </pre>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-primary" onClick={handleAnalyze}>
          <RefreshCw className="size-3.5" />
          Analyze naming
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
          <Download className="size-3.5" />
          Export inventory
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => importInputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          Import plan
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFileChange}
        />
      </div>

      {summary ? (
        <p className="text-xs text-base-content/60">
          {summary.anchorCount} anchor(s) · {summary.proposalCount} proposed change(s) ·{" "}
          {summary.unchangedCount} unchanged
        </p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() =>
                setRows((current) => current.map((row) => ({ ...row, approved: true })))
              }
            >
              Approve all
            </button>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() =>
                setRows((current) => current.map((row) => ({ ...row, approved: false })))
              }
            >
              Clear approval
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={applyMutation.isPending || approvedCount === 0}
              onClick={handleApplyApproved}
              data-test="marker-rename-apply"
            >
              Apply {approvedCount} approved
            </button>
          </div>

          <div className="overflow-x-auto rounded-box border border-base-content/10">
            <table className="table-pin-rows table table-sm">
              <thead>
                <tr>
                  <th className="w-10" />
                  <th>ID</th>
                  <th>Kind</th>
                  <th>Current</th>
                  <th>Proposed</th>
                  <th>Reason</th>
                  <th>Neighbors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={proposalKey(row)}
                    className={cn("cursor-pointer", row.approved ? "bg-secondary/8" : "opacity-70")}
                    onClick={() => setSelection({ kind: "map-point", id: row.pointId })}
                  >
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={row.approved}
                        onChange={(event) =>
                          updateRow(row.pointId, { approved: event.target.checked })
                        }
                      />
                    </td>
                    <td className="font-mono text-xs">{row.pointId}</td>
                    <td className="text-xs">{row.kind}</td>
                    <td className="min-w-36 text-xs">
                      <div className="font-mono">{row.beforeRef ?? "—"}</div>
                      <div className="text-base-content/60">{row.beforeName ?? "—"}</div>
                    </td>
                    <td className="min-w-44" onClick={(event) => event.stopPropagation()}>
                      <input
                        className="input-bordered input input-xs mb-1 w-full font-mono"
                        value={row.afterRef}
                        onChange={(event) =>
                          updateRow(row.pointId, { afterRef: event.target.value })
                        }
                      />
                      <input
                        className="input-bordered input input-xs w-full"
                        value={row.afterName}
                        onChange={(event) =>
                          updateRow(row.pointId, { afterName: event.target.value })
                        }
                      />
                    </td>
                    <td className="max-w-40 text-xs text-base-content/65">{row.reason}</td>
                    <td className="max-w-32 text-[10px] text-base-content/55">
                      {row.neighborLabels.join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-base-content/50">
          Build the spur map first, then analyze naming or export inventory JSON for AI-assisted
          rename review.
        </p>
      )}
    </div>
  );
}
