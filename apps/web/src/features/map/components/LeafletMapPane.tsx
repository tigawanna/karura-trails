import {
  buildMapPointMarkerPinMarkup,
  resolveMapPointMarkerHalo,
  resolveMapPointMarkerIsDeadEnd,
  resolveMapPointMarkerIsNaturalEndpoint,
  resolveMapPointMarkerRing,
} from "@/lib/map/map-point-marker-appearance";
import {
  createBaseLayer,
  createMapHandle,
  DEFAULT_MAP_VIEWPORT,
  LEAFLET_MAP_MAX_ZOOM,
  type MapHandle,
} from "@/lib/map/map-handle";
import type { MapViewport } from "@/types/map/maps";
import { isPickModifierEvent, usePickModifierHeld } from "@/lib/map/pick-modifier";
import { lineStringToLatLngs, segmentGroupColor } from "@/lib/map/segment-utils";
import type { GeoSegmentRecord } from "@/types/map/geo-segments";
import type { MapPointRecord } from "@/types/map/map-points";
import type { MapWorkspaceState } from "@/types/map/maps";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import type { VirtualPreviewEdge } from "@/lib/map/virtual-graph-preview.types";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const MAP_POINT_CATEGORY_COLORS: Record<string, string> = {
  junction: "#7c3aed",
  gate: "#dc2626",
  bridge: "#78350f",
  viewpoint: "#0891b2",
  water: "#2563eb",
  cave: "#78350f",
  rest_area: "#ca8a04",
  sign: "#475569",
  bench: "#a16207",
  waterfall: "#0284c7",
  custom: "#db2777",
};

function mapPointColor(category: string): string {
  return MAP_POINT_CATEGORY_COLORS[category] ?? "#db2777";
}

export type LeafletMapPaneProps = {
  workspace: MapWorkspaceState;
  geoSegments?: GeoSegmentRecord[];
  mapPoints?: MapPointRecord[];
  markerNeighbors?: MarkerNeighborRecord[];
  selectedMapPointId?: number | null;
  placementMode?: boolean;
  linkMode?: boolean;
  linkChainPointIds?: number[];
  linkRouteStartId?: number | null;
  linkRouteEndId?: number | null;
  linkRouteViaIds?: number[];
  showSegments?: boolean;
  showNeighborCoverage?: boolean;
  markerIdsWithNeighborLinks?: number[];
  deadEndMarkerIds?: number[];
  naturalEndpointMarkerIds?: number[];
  onReady: (handle: MapHandle) => void;
  onViewportChange: (viewport: MapViewport) => void;
  onMapPointClick?: (pointId: number, modifiers: { ctrlKey: boolean; metaKey: boolean }) => void;
  onMapPointPlace?: (latitude: number, longitude: number) => void;
  onMapPointMove?: (pointId: number, latitude: number, longitude: number) => void;
  onSegmentClick?: (segmentId: number) => void;
  selectedSegmentId?: number | null;
  virtualPreviewEdges?: VirtualPreviewEdge[];
};

export function LeafletMapPane({
  workspace,
  geoSegments = [],
  mapPoints = [],
  markerNeighbors = [],
  selectedMapPointId = null,
  placementMode = false,
  linkMode = false,
  linkChainPointIds = [],
  linkRouteStartId = null,
  linkRouteEndId = null,
  linkRouteViaIds = [],
  showSegments = true,
  showNeighborCoverage = false,
  markerIdsWithNeighborLinks = [],
  deadEndMarkerIds = [],
  naturalEndpointMarkerIds = [],
  onReady,
  onViewportChange,
  onMapPointClick,
  onMapPointPlace,
  onMapPointMove,
  onSegmentClick,
  selectedSegmentId = null,
  virtualPreviewEdges = [],
}: LeafletMapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const segmentsLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const neighborLinksLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const suppressViewportSyncRef = useRef(false);
  const geocodedRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMapPointClickRef = useRef(onMapPointClick);
  const onMapPointPlaceRef = useRef(onMapPointPlace);
  const onMapPointMoveRef = useRef(onMapPointMove);
  const onSegmentClickRef = useRef(onSegmentClick);
  const placementModeRef = useRef(placementMode);
  const linkModeRef = useRef(linkMode);
  const [mapReady, setMapReady] = useState(false);
  const pickModifierHeld = usePickModifierHeld();

  onReadyRef.current = onReady;
  onViewportChangeRef.current = onViewportChange;
  onMapPointClickRef.current = onMapPointClick;
  onMapPointPlaceRef.current = onMapPointPlace;
  onMapPointMoveRef.current = onMapPointMove;
  onSegmentClickRef.current = onSegmentClick;
  placementModeRef.current = placementMode;
  linkModeRef.current = linkMode;

  useEffect(() => {
    geocodedRef.current = false;
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      segmentsLayerRef.current = null;
      neighborLinksLayerRef.current = null;
      markersLayerRef.current = null;
      setMapReady(false);
    };
  }, [workspace.id]);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (mapRef.current) {
      return;
    }

    async function initMap() {
      const L = await import("leaflet");
      if (disposed || !containerRef.current || mapRef.current) {
        return;
      }

      const latitude = workspace.mapCenterLat ?? DEFAULT_MAP_VIEWPORT.latitude;
      const longitude = workspace.mapCenterLng ?? DEFAULT_MAP_VIEWPORT.longitude;
      const zoom = workspace.mapZoom ?? DEFAULT_MAP_VIEWPORT.zoom;

      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom,
        maxZoom: LEAFLET_MAP_MAX_ZOOM,
        zoomControl: true,
        doubleClickZoom: false,
      });

      createBaseLayer(L, workspace.baseMapStyle).addTo(map);
      segmentsLayerRef.current = L.layerGroup().addTo(map);
      neighborLinksLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

      function emitViewportChange() {
        if (suppressViewportSyncRef.current) {
          return;
        }
        const center = map.getCenter();
        onViewportChangeRef.current({
          latitude: center.lat,
          longitude: center.lng,
          zoom: map.getZoom(),
        });
      }

      map.on("moveend", emitViewportChange);
      map.on("zoomend", emitViewportChange);

      map.on("click", (event) => {
        const modifiers = {
          ctrlKey: event.originalEvent.ctrlKey,
          metaKey: event.originalEvent.metaKey,
        };
        const shouldPlaceMarker =
          placementModeRef.current || (linkModeRef.current && isPickModifierEvent(modifiers));
        if (shouldPlaceMarker && onMapPointPlaceRef.current) {
          onMapPointPlaceRef.current(event.latlng.lat, event.latlng.lng);
        }
      });

      const handle = createMapHandle(map, {
        setSuppressViewportSync: (value) => {
          suppressViewportSyncRef.current = value;
        },
        emitViewportChange,
      });
      onReadyRef.current(handle);

      const locationQuery = workspace.locationQuery?.trim();
      if (locationQuery && !geocodedRef.current) {
        geocodedRef.current = true;
        void handle.panToQuery(locationQuery);
      }
    }

    void initMap();

    return () => {
      disposed = true;
    };
  }, [workspace.id, workspace.baseMapStyle, workspace.locationQuery]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !segmentsLayerRef.current) {
      return;
    }

    let disposed = false;

    async function renderSegments() {
      const L = await import("leaflet");
      if (disposed || !segmentsLayerRef.current) {
        return;
      }

      segmentsLayerRef.current.clearLayers();
      if (!showSegments) {
        return;
      }

      for (const segment of geoSegments) {
        const latLngs = lineStringToLatLngs(segment.geometryJson.coordinates);
        const isSelected = selectedSegmentId === segment.id;
        const polyline = L.polyline(latLngs, {
          color: isSelected ? "#2563eb" : segmentGroupColor(segment.segmentGroupId),
          weight: isSelected ? 5 : 3,
          opacity: isSelected ? 1 : 0.85,
        });
        polyline.on("click", () => onSegmentClickRef.current?.(segment.id));
        polyline.addTo(segmentsLayerRef.current);
      }

      for (const edge of virtualPreviewEdges) {
        const coordinates = edge.geometry.coordinates;
        if (coordinates.length < 2) {
          continue;
        }
        L.polyline(lineStringToLatLngs(coordinates), {
          color: segmentGroupColor(edge.pathSlug),
          weight: 5,
          opacity: 0.82,
          dashArray: "7 5",
          lineCap: "round",
          lineJoin: "round",
        })
          .bindTooltip(`${edge.fromRef} → ${edge.toRef}`)
          .addTo(segmentsLayerRef.current);
      }
    }

    void renderSegments();
    return () => {
      disposed = true;
    };
  }, [geoSegments, mapReady, selectedSegmentId, showSegments, virtualPreviewEdges]);

  useEffect(() => {
    if (!mapReady || !neighborLinksLayerRef.current) {
      return;
    }

    let disposed = false;

    async function renderNeighborLinks() {
      const L = await import("leaflet");
      if (disposed || !neighborLinksLayerRef.current) {
        return;
      }

      neighborLinksLayerRef.current.clearLayers();
      if (!showNeighborCoverage) {
        return;
      }

      const pointsById = new Map(mapPoints.map((point) => [point.id, point]));
      for (const neighbor of markerNeighbors) {
        const from = pointsById.get(neighbor.fromMarkerId);
        const to = pointsById.get(neighbor.toMarkerId);
        if (!from || !to) {
          continue;
        }
        L.polyline(
          [
            [from.latitude, from.longitude],
            [to.latitude, to.longitude],
          ],
          { color: "#22c55e", weight: 2, opacity: 0.7, dashArray: "4 4" },
        ).addTo(neighborLinksLayerRef.current);
      }
    }

    void renderNeighborLinks();
    return () => {
      disposed = true;
    };
  }, [mapPoints, markerNeighbors, mapReady, showNeighborCoverage]);

  useEffect(() => {
    if (!mapReady || !markersLayerRef.current) {
      return;
    }

    let disposed = false;
    const neighborLinkSet = new Set(markerIdsWithNeighborLinks);
    const deadEndSet = new Set(deadEndMarkerIds);
    const naturalEndpointSet = new Set(naturalEndpointMarkerIds);

    async function renderMarkers() {
      const L = await import("leaflet");
      if (disposed || !markersLayerRef.current) {
        return;
      }

      markersLayerRef.current.clearLayers();

      for (const point of mapPoints) {
        const chainIndex = linkChainPointIds.indexOf(point.id);
        const appearanceInput = {
          pointId: point.id,
          selected: selectedMapPointId === point.id,
          linkMode,
          inChain: chainIndex >= 0,
          isLinkHead: linkChainPointIds.at(-1) === point.id,
          isSuggestion: false,
          showNeighborCoverage,
          markerIdsWithNeighborLinks: neighborLinkSet,
          deadEndMarkerIds: deadEndSet,
          naturalEndpointMarkerIds: naturalEndpointSet,
        };

        const ring = resolveMapPointMarkerRing(appearanceInput);
        const halo = resolveMapPointMarkerHalo(ring, appearanceInput);
        const pinSize = 14;
        const pinOffset = -pinSize / 2;
        const html = buildMapPointMarkerPinMarkup({
          pinSize,
          pinOffset,
          ring,
          fillColor: mapPointColor(point.category),
          halo,
          isDeadEnd: resolveMapPointMarkerIsDeadEnd(appearanceInput),
          isNaturalEndpoint: resolveMapPointMarkerIsNaturalEndpoint(appearanceInput),
          label:
            linkRouteStartId === point.id
              ? "S"
              : linkRouteEndId === point.id
                ? "E"
                : linkRouteViaIds.includes(point.id)
                  ? "V"
                  : chainIndex >= 0
                    ? String(chainIndex + 1)
                    : (point.ref ?? ""),
          linkMode,
          markerCursor: pickModifierHeld && !linkMode ? "grab" : "pointer",
        });

        const icon = L.divIcon({
          className: "",
          html,
          iconSize: [pinSize, pinSize],
          iconAnchor: [0, 0],
        });

        const marker = L.marker([point.latitude, point.longitude], {
          icon,
          draggable: pickModifierHeld && !linkMode,
        });

        marker.on("click", (event) => {
          const LEvent = event as import("leaflet").LeafletMouseEvent;
          onMapPointClickRef.current?.(point.id, {
            ctrlKey: LEvent.originalEvent.ctrlKey,
            metaKey: LEvent.originalEvent.metaKey,
          });
        });

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onMapPointMoveRef.current?.(point.id, position.lat, position.lng);
        });

        marker.addTo(markersLayerRef.current);
      }
    }

    void renderMarkers();
    return () => {
      disposed = true;
    };
  }, [
    deadEndMarkerIds,
    mapPoints,
    mapReady,
    markerIdsWithNeighborLinks,
    naturalEndpointMarkerIds,
    linkChainPointIds,
    linkMode,
    linkRouteEndId,
    linkRouteStartId,
    linkRouteViaIds,
    pickModifierHeld,
    selectedMapPointId,
    showNeighborCoverage,
  ]);

  const mapCursor =
    placementMode || (linkMode && pickModifierHeld)
      ? "crosshair"
      : linkMode
        ? "default"
        : undefined;

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      data-test="leaflet-map-pane"
      style={mapCursor ? { cursor: mapCursor } : undefined}
    />
  );
}
