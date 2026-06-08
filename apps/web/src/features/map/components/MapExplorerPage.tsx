import { geoSegmentsQueryOptions } from "@/data-access-layer/pglite/geo-segments";
import { listLocalEvents } from "@/data-access-layer/pglite/local-events";
import {
  createMapPointMutationOptions,
  deleteMapPointMutationOptions,
  mapPointsQueryOptions,
  updateMapPointMutationOptions,
} from "@/data-access-layer/pglite/map-points";
import { mapWorkspaceQueryOptions, updateMapWorkspace } from "@/data-access-layer/pglite/maps";
import { markerNeighborsQueryOptions } from "@/data-access-layer/pglite/marker-neighbors";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { segmentEdgesQueryOptions } from "@/data-access-layer/pglite/segment-edges";
import { trailsQueryOptions } from "@/data-access-layer/pglite/trails";
import { MapExplorerDetailsPanel } from "@/features/map/components/MapExplorerDetailsPanel";
import { MapExplorerTables } from "@/features/map/components/MapExplorerTables";
import { LeafletMapPane } from "@/features/map/components/LeafletMapPane";
import { MapPointEditDialog } from "@/features/map/components/MapPointEditDialog";
import { buildMapBootstrapExport, downloadJsonExport } from "@/features/map/lib/export-bootstrap";
import { flushLocalEventsToSync } from "@/features/map/lib/flush-local-events";
import { useMapExplorerStore } from "@/features/map/store/map-explorer-store";
import {
  buildDeadEndMarkerIds,
  buildMarkerIdsWithNeighborLinks,
  buildNaturalEndpointMarkerIds,
} from "@/lib/map/marker-neighbor-coverage";
import { MAP_POINT_FOCUS_ZOOM, type MapHandle } from "@/lib/map/map-handle";
import { usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, MapPin, RefreshCw, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Group, Panel, Separator } from "react-resizable-panels";

type MapExplorerPageProps = {
  mapId: number;
};

export function MapExplorerPage({ mapId }: MapExplorerPageProps) {
  const { db } = usePglite();
  const queryClient = useQueryClient();
  const mapHandleRef = useRef<MapHandle | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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
  const reset = useMapExplorerStore((state) => state.reset);

  useEffect(() => {
    return () => reset();
  }, [mapId, reset]);

  const mapQuery = useQuery(mapWorkspaceQueryOptions(db, mapId));
  const mapPointsQuery = useQuery(mapPointsQueryOptions(db, mapId));
  const geoSegmentsQueryResult = useQuery(geoSegmentsQueryOptions(db, mapId));
  const markerNeighborsQuery = useQuery(markerNeighborsQueryOptions(db, mapId));
  const segmentEdgesQuery = useQuery(segmentEdgesQueryOptions(db, mapId));
  const trailsQuery = useQuery(trailsQueryOptions(db, mapId));
  const localEventsQuery = useQuery({
    queryKey: pgliteQueryKeys.localEvents(),
    queryFn: () => listLocalEvents(db),
  });

  const createPointMutation = useMutation({
    ...createMapPointMutationOptions(db, mapId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.mapPoints(mapId) });
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      setPlacementMode(false);
      toast.success("Marker created.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create marker.");
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

  const workspace = mapQuery.data;
  const mapPoints = mapPointsQuery.data ?? [];
  const geoSegments = geoSegmentsQueryResult.data ?? [];
  const markerNeighbors = markerNeighborsQuery.data ?? [];
  const segmentEdges = segmentEdgesQuery.data ?? [];
  const trails = trailsQuery.data ?? [];
  const localEvents = localEventsQuery.data ?? [];
  const pendingEventCount = localEvents.filter((event) => !event.flushed).length;

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
              onClick={() => setPlacementMode(!placementMode)}
            >
              <MapPin className="size-3.5" />
              Place marker
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
              className="btn btn-outline btn-sm"
              onClick={() => flushMutation.mutate()}
              disabled={flushMutation.isPending || pendingEventCount === 0}
            >
              <Upload className="size-3.5" />
              Flush events
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              <Download className="size-3.5" />
              Export JSON
            </button>
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
            mapPoints={mapPoints}
            geoSegments={geoSegments}
            segmentEdges={segmentEdges}
            pendingEventCount={pendingEventCount}
            localEvents={localEvents}
          />
        </Panel>
        <Separator className="w-1 bg-base-content/10" />
        <Panel defaultSize={66} minSize={36}>
          <Group orientation="vertical">
            <Panel defaultSize={62} minSize={35}>
              <LeafletMapPane
                workspace={workspace}
                geoSegments={geoSegments}
                mapPoints={mapPoints}
                markerNeighbors={markerNeighbors}
                selectedMapPointId={selectedMapPointId}
                selectedSegmentId={selectedSegmentId}
                placementMode={placementMode}
                showSegments={showSegments}
                showNeighborCoverage={showNeighborCoverage}
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
                onMapPointClick={(pointId) => {
                  setSelection({ kind: "map-point", id: pointId });
                }}
                onMapPointPlace={(latitude, longitude) => {
                  createPointMutation.mutate({ latitude, longitude, category: "custom" });
                }}
                onMapPointMove={(pointId, latitude, longitude) => {
                  updatePointMutation.mutate({ pointId, latitude, longitude });
                }}
                onSegmentClick={(segmentId) => {
                  setSelection({ kind: "segment", id: segmentId });
                }}
              />
            </Panel>
            <Separator className="h-1 bg-base-content/10" />
            <Panel defaultSize={38} minSize={20}>
              <div className="h-full overflow-auto border-t border-base-content/10 bg-base-100/70">
                <MapExplorerDetailsPanel
                  selection={selection}
                  mapPoints={mapPoints}
                  geoSegments={geoSegments}
                  segmentEdges={segmentEdges}
                  onEditPoint={(pointId) => setEditPointId(pointId)}
                />
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>

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
