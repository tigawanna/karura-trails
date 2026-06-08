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
import { useLinkRoutePlanner } from "@/features/map/hooks/useLinkRoutePlanner";
import { useVirtualGraphPreview } from "@/features/map/hooks/useVirtualGraphPreview";
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
import { MAP_POINT_FOCUS_ZOOM, type MapHandle } from "@/lib/map/map-handle";
import { usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Download,
  Link2,
  MapPin,
  Network,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Group, Panel, Separator } from "react-resizable-panels";

type MapExplorerPageProps = {
  mapId: number;
};

export function MapExplorerPage({ mapId }: MapExplorerPageProps) {
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
  const editingPoint =
    editPointId != null ? (mapPoints.find((point) => point.id === editPointId) ?? null) : null;

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

  return (
    <div
      className="flex h-[calc(100vh-8rem)] min-h-[640px] flex-col gap-3"
      data-test="map-explorer-page"
    >
      <div className="rounded-xl border border-base-content/10 bg-base-100/80 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <h1 className="text-lg font-semibold">{workspace.name}</h1>
            <p className="text-xs text-base-content/55">
              Desktop map workspace. Best viewed on a wide screen; tables scroll horizontally.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="join">
              <input
                className="input-bordered input input-sm join-item w-56"
                placeholder="Search location…"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSearch();
                  }
                }}
              />
              <button
                type="button"
                className="btn join-item btn-sm"
                onClick={() => void handleSearch()}
                disabled={isSearching}
              >
                <Search className="size-3.5" />
              </button>
            </div>
            <button
              type="button"
              className={placementMode ? "btn btn-sm btn-primary" : "btn btn-outline btn-sm"}
              onClick={() => {
                setPlacementMode(!placementMode);
                if (!placementMode) {
                  setLinkMode(false);
                }
              }}
            >
              <MapPin className="size-3.5" />
              Place marker
            </button>
            <button
              type="button"
              className={linkMode ? "btn btn-sm btn-primary" : "btn btn-outline btn-sm"}
              onClick={() => {
                setLinkMode(!linkMode);
                if (!linkMode) {
                  setPlacementMode(false);
                }
              }}
            >
              <Link2 className="size-3.5" />
              Link mode
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={seedTrailsMutation.isPending}
              onClick={() => seedTrailsMutation.mutate()}
            >
              <Database className="size-3.5" />
              Import trails
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowNeighborCoverage(!showNeighborCoverage)}
            >
              Neighbors
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowSegments(!showSegments)}
            >
              Segments
            </button>
            <button
              type="button"
              className={graphPreviewOpen ? "btn btn-sm btn-secondary" : "btn btn-outline btn-sm"}
              onClick={handleToggleGraphPreview}
              disabled={pathSlugs.length === 0}
              data-test="graph-preview-toggle"
            >
              <Network className="size-3.5" />
              Graph preview
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => flushMutation.mutate()}
              disabled={flushMutation.isPending || pendingEventCount === 0}
            >
              <Upload className="size-3.5" />
              Flush events
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => squashMutation.mutate()}
              disabled={squashMutation.isPending}
            >
              Squash approved
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              <Download className="size-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={importMutation.isPending}
              onClick={() => importInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Import JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFileChange}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["pglite"] });
              }}
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <Group
        orientation="horizontal"
        className="min-h-0 flex-1 rounded-xl border border-base-content/10"
      >
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
            routePanel={
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
            }
          />
        </Panel>
        <Separator className="w-1 bg-base-content/10" />
        <Panel defaultSize={66} minSize={36}>
          <div className="relative h-full min-h-0">
            <Group orientation="vertical" className="h-full">
              <Panel defaultSize={62} minSize={35}>
                <div className="relative h-full">
                  <LeafletMapPane
                    workspace={workspace}
                    geoSegments={geoSegments}
                    mapPoints={mapPoints}
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
