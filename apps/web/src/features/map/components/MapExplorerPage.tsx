import {
  geoSegmentsQueryOptions,
  seedTrailsMutationOptions,
} from "@/data-access-layer/pglite/geo-segments";
import { importMapBootstrap } from "@/data-access-layer/pglite/import-bootstrap";
import { listLocalEvents } from "@/data-access-layer/pglite/local-events";
import { mapLandmarkTypesQueryOptions } from "@/data-access-layer/pglite/map-landmark-types";
import {
  createMapPointMutationOptions,
  deleteMapPointMutationOptions,
  mapPointsQueryOptions,
  updateMapPointMutationOptions,
} from "@/data-access-layer/pglite/map-points";
import { mapWorkspaceQueryOptions, updateMapWorkspace } from "@/data-access-layer/pglite/maps";
import {
  insertMarkerBetweenMutationOptions,
  markerNeighborsQueryOptions,
  replaceMarkerNeighborsMutationOptions,
} from "@/data-access-layer/pglite/marker-neighbors";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import {
  createSegmentEdgeChainMutationOptions,
  segmentEdgesQueryOptions,
} from "@/data-access-layer/pglite/segment-edges";
import { trailsQueryOptions } from "@/data-access-layer/pglite/trails";
import { MapGraphPreviewPanel } from "@/features/map/components/MapGraphPreviewPanel";
import { MapLinkComposerPanel } from "@/features/map/components/MapLinkComposerPanel";
import { MapWorkspaceToolbar } from "@/features/map/components/MapWorkspaceToolbar";
import { useLinkRoutePlanner } from "@/features/map/hooks/useLinkRoutePlanner";
import { useMapExplorerHotkeys } from "@/features/map/hooks/useMapExplorerHotkeys";
import { useVirtualGraphPreview } from "@/features/map/hooks/useVirtualGraphPreview";
import { useKeyboardShortcutsStore } from "@/features/map/shortcuts/keyboard-shortcuts-store";
import { groupSegmentsByPath } from "@/lib/map/group-segments-by-path";
import { flattenVirtualPreviewEdges } from "@/lib/map/virtual-graph-preview.types";
import { isPickModifierEvent } from "@/lib/map/pick-modifier";
import { MapExplorerDetailsPanel } from "@/features/map/components/MapExplorerDetailsPanel";
import { MapExplorerTables } from "@/features/map/components/MapExplorerTables";
import { LeafletMapPane } from "@/features/map/components/LeafletMapPane";
import { MapMarkerCaptureDialog } from "@/features/map/components/MapMarkerCaptureDialog";
import { MapPointEditDialog } from "@/features/map/components/MapPointEditDialog";
import {
  buildMapMarkerDraftFromCoordinates,
  finalizeMapMarkerCaptureDraft,
  mapMarkerDraftToCreateInput,
  type MapMarkerSaveDraft,
} from "@/features/map/lib/map-marker-save-draft";
import { toMapPointPlacementSource } from "@/lib/map/suggest-insert-between-marker-name";
import { buildMapBootstrapExport, downloadJsonExport } from "@/features/map/lib/export-bootstrap";
import { flushLocalEventsToSync } from "@/features/map/lib/flush-local-events";
import { squashApprovedSyncEvents } from "@/features/map/lib/squash-approved-events";
import { fetchAdminSyncEvents } from "@/services/sync/sync.api";
import { useMapExplorerStore } from "@/features/map/store/map-explorer-store";
import {
  buildDeadEndMarkerIds,
  buildMarkerIdsWithNeighborLinks,
  buildNaturalEndpointMarkerIds,
} from "@/lib/map/marker-neighbor-coverage";
import { filterMapPointsForMapDisplay } from "@/lib/map/filter-map-points-for-map-display";
import { MAP_POINT_FOCUS_ZOOM, type MapHandle } from "@/lib/map/map-handle";
import { usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Table2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Group, Panel, Separator } from "react-resizable-panels";

type MapExplorerPageProps = {
  mapId: number;
  variant?: "explorer" | "workspace";
};

export function MapExplorerPage({ mapId, variant = "explorer" }: MapExplorerPageProps) {
  const isWorkspace = variant === "workspace";
  const { db } = usePglite();
  const queryClient = useQueryClient();
  const mapHandleRef = useRef<MapHandle | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pathSlug, setPathSlug] = useState("manual-segments");
  const [captureDraft, setCaptureDraft] = useState<MapMarkerSaveDraft | null>(null);

  const selection = useMapExplorerStore((state) => state.selection);
  const setSelection = useMapExplorerStore((state) => state.setSelection);
  const editPointId = useMapExplorerStore((state) => state.editPointId);
  const setEditPointId = useMapExplorerStore((state) => state.setEditPointId);
  const placementMode = useMapExplorerStore((state) => state.placementMode);
  const setPlacementMode = useMapExplorerStore((state) => state.setPlacementMode);
  const showNeighborCoverage = useMapExplorerStore((state) => state.showNeighborCoverage);
  const setShowNeighborCoverage = useMapExplorerStore((state) => state.setShowNeighborCoverage);
  const showSegments = useMapExplorerStore((state) => state.showSegments);
  const setShowSegments = useMapExplorerStore((state) => state.setShowSegments);
  const hideVirtualMarkers = useMapExplorerStore((state) => state.hideVirtualMarkers);
  const setHideVirtualMarkers = useMapExplorerStore((state) => state.setHideVirtualMarkers);
  const statusMessage = useMapExplorerStore((state) => state.statusMessage);
  const linkMode = useMapExplorerStore((state) => state.linkMode);
  const setLinkMode = useMapExplorerStore((state) => state.setLinkMode);
  const linkChain = useMapExplorerStore((state) => state.linkChain);
  const setLinkChain = useMapExplorerStore((state) => state.setLinkChain);
  const appendLinkChainPoint = useMapExplorerStore((state) => state.appendLinkChainPoint);
  const removeLinkChainPointAt = useMapExplorerStore((state) => state.removeLinkChainPointAt);
  const clearLinkChain = useMapExplorerStore((state) => state.clearLinkChain);
  const setStatusMessage = useMapExplorerStore((state) => state.setStatusMessage);
  const graphPreviewOpen = useMapExplorerStore((state) => state.graphPreviewOpen);
  const graphPreviewVisibleSlugs = useMapExplorerStore((state) => state.graphPreviewVisibleSlugs);
  const openGraphPreview = useMapExplorerStore((state) => state.openGraphPreview);
  const closeGraphPreview = useMapExplorerStore((state) => state.closeGraphPreview);
  const reset = useMapExplorerStore((state) => state.reset);

  useEffect(() => {
    return () => reset();
  }, [mapId, reset]);

  const mapQuery = useQuery(mapWorkspaceQueryOptions(db, mapId));
  const mapPointsQuery = useQuery(mapPointsQueryOptions(db, mapId));
  const geoSegmentsQueryResult = useQuery(geoSegmentsQueryOptions(db, mapId));
  const markerNeighborsQuery = useQuery(markerNeighborsQueryOptions(db, mapId));
  const segmentEdgesQuery = useQuery(segmentEdgesQueryOptions(db, mapId));
  const landmarkTypesQuery = useQuery(mapLandmarkTypesQueryOptions(db, mapId));
  const trailsQuery = useQuery(trailsQueryOptions(db, mapId));
  const localEventsQuery = useQuery({
    queryKey: pgliteQueryKeys.localEvents(),
    queryFn: () => listLocalEvents(db),
  });

  const createPointMutation = useMutation({
    ...createMapPointMutationOptions(db, mapId),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create marker.");
    },
  });

  const insertBetweenMutation = useMutation({
    ...insertMarkerBetweenMutationOptions(db, mapId),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to rewire neighbors.");
    },
  });

  const updatePointMutation = useMutation({
    ...updateMapPointMutationOptions(db, mapId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.mapPoints(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      setEditPointId(null);
      toast.success("Marker updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update marker.");
    },
  });

  const deletePointMutation = useMutation({
    ...deleteMapPointMutationOptions(db, mapId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.mapPoints(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      setEditPointId(null);
      setSelection(null);
      toast.success("Marker deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete marker.");
    },
  });

  const flushMutation = useMutation({
    mutationFn: () => flushLocalEventsToSync(db),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      toast.success(`Flushed ${result.pushed} event(s) to sync.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to flush events.");
    },
  });

  const seedTrailsMutation = useMutation({
    ...seedTrailsMutationOptions(db, mapId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.geoSegments(mapId) });
      if (result.skipped) {
        toast.message("Trail segments already loaded.");
      } else {
        toast.success(`Imported ${result.imported} trail segments.`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to import trails.");
    },
  });

  const replaceNeighborsMutation = useMutation({
    ...replaceMarkerNeighborsMutationOptions(db, mapId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.markerNeighbors(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      toast.success("Neighbors updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update neighbors.");
    },
  });

  const squashMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchAdminSyncEvents();
      return squashApprovedSyncEvents(db, mapId, response.events);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.mapPoints(mapId) });
      toast.success(`Squashed ${result.applied} of ${result.total} approved event(s).`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to squash approved events.");
    },
  });

  const importMutation = useMutation({
    mutationFn: (payload: unknown) => importMapBootstrap(db, mapId, payload),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["pglite"] });
      toast.success(
        `Imported ${result.mapPointsCreated} point(s), ${result.markerNeighborsCreated} neighbor(s), ${result.geoSegmentsCreated} segment(s), ${result.segmentEdgesCreated + result.segmentEdgesUpdated} edge(s).`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to import bootstrap.");
    },
  });

  const createChainMutation = useMutation({
    ...createSegmentEdgeChainMutationOptions(db, mapId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.segmentEdges(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      clearLinkChain();
      toast.success(`Created ${result.segments.length} segment edge(s).`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save segment edges.");
    },
  });

  const workspace = mapQuery.data;
  const mapPoints = mapPointsQuery.data ?? [];
  const geoSegments = geoSegmentsQueryResult.data ?? [];
  const markerNeighbors = markerNeighborsQuery.data ?? [];
  const segmentEdges = segmentEdgesQuery.data ?? [];
  const landmarkTypes = landmarkTypesQuery.data ?? [];
  const trails = trailsQuery.data ?? [];
  const pathGroups = useMemo(() => groupSegmentsByPath(geoSegments), [geoSegments]);
  const pathSlugs = useMemo(() => pathGroups.map((group) => group.groupId), [pathGroups]);

  const {
    previews: graphPreviews,
    loading: graphPreviewLoading,
    error: graphPreviewError,
    reload: reloadGraphPreview,
  } = useVirtualGraphPreview(db, mapId, pathSlugs, graphPreviewOpen);

  const virtualPreviewEdges = graphPreviewOpen
    ? flattenVirtualPreviewEdges(graphPreviews, new Set(graphPreviewVisibleSlugs))
    : [];

  const handleToggleGraphPreview = useCallback(() => {
    if (graphPreviewOpen) {
      closeGraphPreview();
      return;
    }
    openGraphPreview(pathSlugs);
  }, [closeGraphPreview, graphPreviewOpen, openGraphPreview, pathSlugs]);
  const localEvents = localEventsQuery.data ?? [];
  const pendingEventCount = localEvents.filter((event) => !event.flushed).length;

  const routePlanner = useLinkRoutePlanner({
    mapPoints,
    markerNeighbors,
    onApplyChain: setLinkChain,
    onStatusMessage: setStatusMessage,
  });

  const markerIdsWithNeighborLinks = useMemo(
    () => buildMarkerIdsWithNeighborLinks(markerNeighbors),
    [markerNeighbors],
  );
  const deadEndMarkerIds = useMemo(
    () => buildDeadEndMarkerIds(mapPoints, markerNeighbors),
    [mapPoints, markerNeighbors],
  );
  const naturalEndpointMarkerIds = useMemo(
    () => buildNaturalEndpointMarkerIds(mapPoints, markerNeighbors),
    [mapPoints, markerNeighbors],
  );

  const selectedMapPointId = selection?.kind === "map-point" ? selection.id : null;
  const selectedSegmentId = selection?.kind === "segment" ? selection.id : null;
  const displayedMapPoints = useMemo(
    () =>
      filterMapPointsForMapDisplay(mapPoints, {
        hideVirtualMarkers,
        alwaysVisiblePointIds: selectedMapPointId != null ? [selectedMapPointId] : [],
      }),
    [hideVirtualMarkers, mapPoints, selectedMapPointId],
  );
  const editingPoint =
    editPointId != null ? (mapPoints.find((point) => point.id === editPointId) ?? null) : null;

  const openShortcuts = useKeyboardShortcutsStore((state) => state.setOpen);

  const handleHotkeyDismiss = useCallback(() => {
    if (captureDraft) {
      setCaptureDraft(null);
      return;
    }
    if (editPointId != null) {
      setEditPointId(null);
      return;
    }
    if (graphPreviewOpen) {
      closeGraphPreview();
      return;
    }
    if (placementMode) {
      setPlacementMode(false);
      return;
    }
    if (linkMode) {
      setLinkMode(false);
    }
  }, [
    captureDraft,
    closeGraphPreview,
    editPointId,
    graphPreviewOpen,
    linkMode,
    placementMode,
    setEditPointId,
    setLinkMode,
    setPlacementMode,
  ]);

  useMapExplorerHotkeys({
    enabled: Boolean(workspace),
    hasCaptureDraft: captureDraft != null,
    hasEditDialog: editPointId != null,
    graphPreviewOpen,
    placementMode,
    linkMode,
    selectedMapPointId,
    pathSlugs,
    onToggleNeighborCoverage: () => setShowNeighborCoverage(!showNeighborCoverage),
    onToggleHideVirtualMarkers: () => setHideVirtualMarkers(!hideVirtualMarkers),
    onToggleSegments: () => setShowSegments(!showSegments),
    onTogglePlacementMode: () => {
      setPlacementMode(!placementMode);
      if (!placementMode) {
        setLinkMode(false);
      }
    },
    onToggleLinkMode: () => {
      setLinkMode(!linkMode);
      if (!linkMode) {
        setPlacementMode(false);
      }
    },
    onToggleGraphPreview: handleToggleGraphPreview,
    onOpenMarkerEditor: () => {
      if (selectedMapPointId != null) {
        setEditPointId(selectedMapPointId);
      }
    },
    onDismiss: handleHotkeyDismiss,
  });

  useEffect(() => {
    if (!selection || selection.kind !== "map-point" || !mapHandleRef.current) {
      return;
    }
    const point = mapPoints.find((entry) => entry.id === selection.id);
    if (!point) {
      return;
    }
    mapHandleRef.current.setViewport({
      latitude: point.latitude,
      longitude: point.longitude,
      zoom: MAP_POINT_FOCUS_ZOOM,
    });
  }, [mapPoints, selection]);

  async function handleSearch() {
    if (!mapHandleRef.current || !locationQuery.trim()) {
      return;
    }
    setIsSearching(true);
    const result = await mapHandleRef.current.panToQuery(locationQuery.trim());
    setIsSearching(false);
    if (result.error) {
      toast.error(result.error);
    }
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
        const payload = JSON.parse(reader.result) as unknown;
        importMutation.mutate(payload);
      } catch {
        toast.error("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  }

  function handleMapPointPlace(latitude: number, longitude: number) {
    const baseDraft = buildMapMarkerDraftFromCoordinates({
      latitude,
      longitude,
      geoSegments,
    });
    const draft = finalizeMapMarkerCaptureDraft(baseDraft, {
      mapPoints,
      markerNeighbors,
      geoSegments,
      virtualContext: {
        linkMode,
        chainPointIds: linkChain,
        mapPoints: mapPoints.map(toMapPointPlacementSource),
        captureCoordinates: { latitude, longitude },
      },
    });
    setCaptureDraft(draft);
  }

  async function handleCaptureSave(draft: MapMarkerSaveDraft) {
    const insertBetween = draft.insertBetween;
    try {
      const point = await createPointMutation.mutateAsync(
        mapMarkerDraftToCreateInput(mapId, draft),
      );
      if (insertBetween) {
        await insertBetweenMutation.mutateAsync({
          newMarkerId: point.id,
          fromMarkerId: insertBetween.fromMarkerId,
          toMarkerId: insertBetween.toMarkerId,
        });
      }
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.mapPoints(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.markerNeighbors(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      setCaptureDraft(null);
      setPlacementMode(false);
      if (insertBetween) {
        toast.success(
          `Saved "${point.name ?? draft.name}" between ${insertBetween.fromRef} and ${insertBetween.toRef}.`,
        );
      } else if (linkMode && !linkChain.includes(point.id)) {
        appendLinkChainPoint(point.id);
        toast.success(`Added "${point.name ?? draft.name}" to link chain.`);
      } else {
        toast.success(`Saved "${point.name ?? draft.name}".`);
      }
    } catch {
      return;
    }
  }

  function handleExport() {
    if (!workspace) {
      return;
    }
    const payload = buildMapBootstrapExport({
      mapId: workspace.id,
      mapName: workspace.name,
      mapPoints,
      markerNeighbors,
      geoSegments,
      segmentEdges,
      trails,
    });
    downloadJsonExport(`karura-map-bootstrap-${workspace.id}.json`, payload);
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-lg loading-spinner text-primary" />
      </div>
    );
  }

  const mapPane = (
    <LeafletMapPane
      workspace={workspace}
      geoSegments={geoSegments}
      mapPoints={displayedMapPoints}
      markerNeighbors={markerNeighbors}
      selectedMapPointId={selectedMapPointId}
      selectedSegmentId={selectedSegmentId}
      placementMode={placementMode}
      linkMode={linkMode || routePlanner.pickTarget != null}
      linkChainPointIds={linkChain}
      linkRouteStartId={routePlanner.startId}
      linkRouteEndId={routePlanner.endId}
      linkRouteViaIds={routePlanner.viaIds}
      showSegments={showSegments}
      showNeighborCoverage={showNeighborCoverage}
      virtualPreviewEdges={virtualPreviewEdges}
      markerIdsWithNeighborLinks={markerIdsWithNeighborLinks}
      deadEndMarkerIds={deadEndMarkerIds}
      naturalEndpointMarkerIds={naturalEndpointMarkerIds}
      onReady={(handle) => {
        mapHandleRef.current = handle;
      }}
      onViewportChange={(viewport) => {
        void updateMapWorkspace(db, mapId, {
          mapCenterLat: viewport.latitude,
          mapCenterLng: viewport.longitude,
          mapZoom: viewport.zoom,
        });
      }}
      onMapPointClick={(pointId, modifiers) => {
        if (routePlanner.handleMapPointClickForRoutePick(pointId)) {
          return;
        }
        if (linkMode && isPickModifierEvent(modifiers)) {
          appendLinkChainPoint(pointId);
          return;
        }
        setSelection({ kind: "map-point", id: pointId });
      }}
      onMapPointPlace={handleMapPointPlace}
      onMapPointMove={(pointId, latitude, longitude) => {
        updatePointMutation.mutate({ pointId, latitude, longitude });
      }}
      onSegmentClick={(segmentId) => {
        setSelection({ kind: "segment", id: segmentId });
      }}
    />
  );

  const mapLegendHints =
    graphPreviewOpen || hideVirtualMarkers ? (
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex flex-col items-start gap-1 px-3">
        {graphPreviewOpen ? (
          <div className="max-w-[18rem] rounded-md bg-base-100/92 px-2.5 py-1.5 text-[10px] text-base-content/65 shadow-sm">
            Dashed lines are virtual graph preview edges (not saved).
          </div>
        ) : null}
        {hideVirtualMarkers ? (
          <div className="max-w-[14rem] rounded-md bg-base-100/92 px-2.5 py-1.5 text-[10px] text-base-content/65 shadow-sm">
            Virtual markers are hidden. Selected markers stay visible.
          </div>
        ) : null}
      </div>
    ) : null;

  const linkComposerPanel = (
    <MapLinkComposerPanel
      mapPoints={mapPoints}
      linkChain={linkChain}
      pathSlug={pathSlug}
      onPathSlugChange={setPathSlug}
      onAppendToChain={appendLinkChainPoint}
      onRemoveFromChain={removeLinkChainPointAt}
      onClearChain={clearLinkChain}
      isSaving={createChainMutation.isPending}
      onSaveSegments={() => createChainMutation.mutate({ pointIds: linkChain, pathSlug })}
      routePlanner={routePlanner}
    />
  );

  const detailsPanel = (
    <MapExplorerDetailsPanel
      selection={selection}
      mapPoints={mapPoints}
      markerNeighbors={markerNeighbors}
      geoSegments={geoSegments}
      segmentEdges={segmentEdges}
      isSavingNeighbors={replaceNeighborsMutation.isPending}
      onEditPoint={(pointId) => setEditPointId(pointId)}
      onReplaceNeighbors={(pointId, toMarkerIds) =>
        replaceNeighborsMutation.mutate({ fromMarkerId: pointId, toMarkerIds })
      }
    />
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-test={isWorkspace ? "map-workspace-page" : "map-explorer-page"}
    >
      <header className="relative z-30 flex shrink-0 items-center gap-2 border-b border-base-content/10 bg-base-100 px-2 py-1.5">
        <SidebarTrigger className="-ml-0.5" />
        <Link
          to="/dashboard"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-base-content/60 hover:bg-base-content/10 hover:text-base-content"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{workspace.name}</h1>
        </div>
        {isWorkspace ? (
          <Link to="/map" className="btn gap-1.5 btn-ghost btn-sm" data-test="open-data-explorer">
            <Table2 className="size-3.5" />
            Data explorer
          </Link>
        ) : (
          <Link
            to="/maps/$mapId"
            params={{ mapId: String(mapId) }}
            className="btn gap-1.5 btn-ghost btn-sm"
            data-test="open-map-workspace"
          >
            <ExternalLink className="size-3.5" />
            Full map
          </Link>
        )}
        <MapWorkspaceToolbar
          locationQuery={locationQuery}
          isSearching={isSearching}
          onLocationQueryChange={setLocationQuery}
          onSearch={() => void handleSearch()}
          placementMode={placementMode}
          onPlacementModeChange={setPlacementMode}
          linkMode={linkMode}
          onLinkModeChange={setLinkMode}
          showNeighborCoverage={showNeighborCoverage}
          onShowNeighborCoverageChange={setShowNeighborCoverage}
          showSegments={showSegments}
          onShowSegmentsChange={setShowSegments}
          hideVirtualMarkers={hideVirtualMarkers}
          onHideVirtualMarkersChange={setHideVirtualMarkers}
          graphPreviewOpen={graphPreviewOpen}
          onToggleGraphPreview={handleToggleGraphPreview}
          graphPreviewDisabled={pathSlugs.length === 0}
          onImportTrails={() => seedTrailsMutation.mutate()}
          importTrailsPending={seedTrailsMutation.isPending}
          onImportJson={() => importInputRef.current?.click()}
          importJsonPending={importMutation.isPending}
          onExportJson={handleExport}
          onFlushEvents={() => flushMutation.mutate()}
          flushEventsPending={flushMutation.isPending}
          flushEventsDisabled={pendingEventCount === 0}
          onSquashApproved={() => squashMutation.mutate()}
          squashPending={squashMutation.isPending}
          onOpenShortcuts={() => openShortcuts(true)}
          onRefreshData={() => {
            void queryClient.invalidateQueries({ queryKey: ["pglite"] });
          }}
        />
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFileChange}
        />
      </header>

      {isWorkspace ? (
        <div className="relative min-h-0 flex-1 overflow-hidden bg-base-200">
          <div className="relative h-full min-h-0">
            {mapPane}
            {mapLegendHints}
          </div>
          {linkMode ? (
            <div className="absolute inset-y-0 right-0 z-[1100] flex w-96 flex-col border-l border-base-content/10 bg-base-100 shadow-xl">
              <div className="flex items-center justify-between border-b border-base-content/10 px-3 py-2">
                <span className="text-sm font-semibold">Link composer</span>
                <button
                  type="button"
                  className="btn btn-circle btn-ghost btn-xs"
                  onClick={() => {
                    setLinkMode(false);
                    setStatusMessage(null);
                  }}
                  aria-label="Close link composer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{linkComposerPanel}</div>
            </div>
          ) : null}
          {graphPreviewOpen ? (
            <div className="absolute inset-y-0 right-0 z-[1150] w-96 shadow-xl">
              <MapGraphPreviewPanel
                pathGroups={pathGroups}
                previews={graphPreviews}
                loading={graphPreviewLoading}
                error={graphPreviewError}
                onReload={reloadGraphPreview}
                onClose={closeGraphPreview}
              />
            </div>
          ) : null}
          {selection && !linkMode && !graphPreviewOpen ? (
            <div className="absolute inset-y-0 right-0 z-[1200] flex w-80 flex-col border-l border-base-content/10 bg-base-100 shadow-xl">
              <div className="flex items-center justify-between border-b border-base-content/10 px-3 py-2">
                <span className="text-sm font-semibold">Details</span>
                <button
                  type="button"
                  className="btn btn-circle btn-ghost btn-xs"
                  onClick={() => setSelection(null)}
                  aria-label="Close details panel"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{detailsPanel}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <Group orientation="horizontal" className="min-h-0 flex-1">
          <Panel defaultSize={34} minSize={24}>
            <MapExplorerTables
              db={db}
              mapId={mapId}
              mapName={workspace.name}
              mapPoints={mapPoints}
              markerNeighbors={markerNeighbors}
              geoSegments={geoSegments}
              segmentEdges={segmentEdges}
              landmarkTypes={landmarkTypes}
              pendingEventCount={pendingEventCount}
              localEvents={localEvents}
              pathSlug={pathSlug}
              onPathSlugChange={setPathSlug}
              onSegmentsBuilt={async () => {
                await queryClient.invalidateQueries({
                  queryKey: pgliteQueryKeys.segmentEdges(mapId),
                });
                await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
              }}
              routePanel={linkComposerPanel}
            />
          </Panel>
          <Separator className="w-1 bg-base-content/10" />
          <Panel defaultSize={66} minSize={36}>
            <div className="relative h-full min-h-0">
              <Group orientation="vertical" className="h-full">
                <Panel defaultSize={62} minSize={35}>
                  <div className="relative h-full">
                    {mapPane}
                    {graphPreviewOpen ? (
                      <div
                        className={`pointer-events-none absolute left-3 z-[1000] max-w-[18rem] rounded-md bg-base-100/92 px-2.5 py-1.5 text-[10px] text-base-content/65 shadow-sm ${showNeighborCoverage ? "bottom-12" : "bottom-3"}`}
                      >
                        Dashed lines are virtual graph preview edges (not saved).
                      </div>
                    ) : null}
                  </div>
                </Panel>
                <Separator className="h-1 bg-base-content/10" />
                <Panel defaultSize={38} minSize={20}>
                  <div className="h-full overflow-auto border-t border-base-content/10 bg-base-100/70">
                    {detailsPanel}
                  </div>
                </Panel>
              </Group>
              {graphPreviewOpen ? (
                <div className="absolute inset-y-0 right-0 z-[1150] w-96 shadow-xl">
                  <MapGraphPreviewPanel
                    pathGroups={pathGroups}
                    previews={graphPreviews}
                    loading={graphPreviewLoading}
                    error={graphPreviewError}
                    onReload={reloadGraphPreview}
                    onClose={closeGraphPreview}
                  />
                </div>
              ) : null}
            </div>
          </Panel>
        </Group>
      )}

      {statusMessage ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1500] flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-lg items-start gap-2 rounded-lg border border-base-content/10 bg-base-100 px-4 py-3 text-sm shadow-lg">
            <span className="flex-1">{statusMessage}</span>
            <button
              type="button"
              className="btn btn-circle btn-ghost btn-xs"
              onClick={() => setStatusMessage(null)}
              aria-label="Dismiss status message"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <MapMarkerCaptureDialog
        draft={captureDraft}
        mapPoints={mapPoints}
        geoSegments={geoSegments}
        open={captureDraft != null}
        onClose={() => setCaptureDraft(null)}
        onSave={(draft) => void handleCaptureSave(draft)}
        isSaving={createPointMutation.isPending || insertBetweenMutation.isPending}
      />

      <MapPointEditDialog
        point={editingPoint}
        open={editPointId != null}
        onClose={() => setEditPointId(null)}
        isSaving={updatePointMutation.isPending || deletePointMutation.isPending}
        onSave={(values) => {
          if (!editingPoint) {
            return;
          }
          updatePointMutation.mutate({
            pointId: editingPoint.id,
            ref: values.ref || null,
            name: values.name || null,
            category: values.category,
            description: values.description || null,
            elevation: values.elevation.trim() ? Number(values.elevation) : null,
            elevationSource: values.elevation.trim() ? "manual" : null,
          });
        }}
        onDelete={() => {
          if (!editingPoint) {
            return;
          }
          deletePointMutation.mutate(editingPoint.id);
        }}
      />
    </div>
  );
}
