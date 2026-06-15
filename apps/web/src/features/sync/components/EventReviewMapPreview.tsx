import type { EventMapPreview } from "@/lib/sync/event-map-preview";
import { KARURA_MAP_VIEWPORT } from "@/lib/map/karura-map-defaults";
import { Maximize2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type EventReviewMapPreviewProps = {
  preview: EventMapPreview;
  viewportKey?: string;
  draggablePointId?: string | null;
  onPointMove?: (pointId: string, latitude: number, longitude: number) => void;
};

function fitMapToPreview(map: L.Map, preview: EventMapPreview) {
  const bounds = L.latLngBounds([]);
  for (const point of preview.points) {
    bounds.extend([point.latitude, point.longitude]);
  }
  for (const edge of preview.edges) {
    bounds.extend([edge.from.latitude, edge.from.longitude]);
    bounds.extend([edge.to.latitude, edge.to.longitude]);
  }

  if (preview.points.length > 0) {
    map.fitBounds(bounds.pad(0.35), { animate: false });
    return;
  }

  map.setView(
    [KARURA_MAP_VIEWPORT.latitude, KARURA_MAP_VIEWPORT.longitude],
    KARURA_MAP_VIEWPORT.zoom,
    { animate: false },
  );
}

function createDraggableMarker(
  point: EventMapPreview["points"][number],
  onMove: (pointId: string, latitude: number, longitude: number) => void,
) {
  const latLng = L.latLng(point.latitude, point.longitude);
  const marker = L.marker(latLng, {
    draggable: true,
    autoPan: false,
    icon: L.divIcon({
      className: "",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#7c3aed;border:2px solid #5b21b6;box-shadow:0 0 0 2px rgba(124,58,237,0.35);cursor:grab;"></div>`,
    }),
  });
  marker.bindTooltip(`${point.label} (drag to adjust)`, {
    sticky: true,
    direction: "top",
    offset: [0, -10],
  });
  marker.on("dragend", () => {
    const next = marker.getLatLng();
    onMove(point.id, next.lat, next.lng);
  });
  return marker;
}

export function EventReviewMapPreview({
  preview,
  viewportKey,
  draggablePointId = null,
  onPointMove,
}: EventReviewMapPreviewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const draggableMarkerRef = useRef<L.Marker | null>(null);
  const onPointMoveRef = useRef(onPointMove);
  const lastViewportKeyRef = useRef<string | undefined>(undefined);
  onPointMoveRef.current = onPointMove;

  const refreshMapSize = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.invalidateSize({ animate: false });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    overlayLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      refreshMapSize();
    });
    resizeObserver.observe(container);

    const onFullscreenChange = () => {
      requestAnimationFrame(() => {
        refreshMapSize();
      });
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    requestAnimationFrame(() => {
      refreshMapSize();
    });

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      map.remove();
      mapRef.current = null;
      overlayLayerRef.current = null;
      draggableMarkerRef.current = null;
      lastViewportKeyRef.current = undefined;
    };
  }, [refreshMapSize]);

  useEffect(() => {
    const map = mapRef.current;
    const overlay = overlayLayerRef.current;
    if (!map || !overlay) {
      return;
    }

    overlay.clearLayers();
    draggableMarkerRef.current = null;

    for (const point of preview.points) {
      const latLng = L.latLng(point.latitude, point.longitude);
      const isDraggable = draggablePointId != null && point.id === draggablePointId;

      if (isDraggable) {
        const marker = createDraggableMarker(point, (pointId, latitude, longitude) => {
          onPointMoveRef.current?.(pointId, latitude, longitude);
        });
        marker.addTo(overlay);
        draggableMarkerRef.current = marker;
        continue;
      }

      L.circleMarker(latLng, {
        radius: point.emphasis ? 8 : 6,
        color: point.emphasis ? "#7c3aed" : "#2563eb",
        fillColor: point.emphasis ? "#7c3aed" : "#2563eb",
        fillOpacity: 0.85,
        weight: 2,
      })
        .bindTooltip(point.label, { sticky: true })
        .addTo(overlay);
    }

    for (const edge of preview.edges) {
      L.polyline(
        [
          [edge.from.latitude, edge.from.longitude],
          [edge.to.latitude, edge.to.longitude],
        ],
        { color: "#7c3aed", weight: 3, dashArray: "6 4" },
      ).addTo(overlay);
    }
  }, [draggablePointId, preview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || viewportKey == null) {
      return;
    }

    if (lastViewportKeyRef.current === viewportKey) {
      return;
    }

    lastViewportKeyRef.current = viewportKey;
    requestAnimationFrame(() => {
      refreshMapSize();
      fitMapToPreview(map, preview);
    });
  }, [preview, refreshMapSize, viewportKey]);

  const openFullscreen = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    if (document.fullscreenElement === wrapper) {
      void document.exitFullscreen();
      return;
    }

    void wrapper.requestFullscreen().then(() => {
      requestAnimationFrame(() => {
        refreshMapSize();
        const map = mapRef.current;
        if (map) {
          fitMapToPreview(map, preview);
        }
      });
    });
  };

  return (
    <div ref={wrapperRef} className="relative h-full min-h-[280px] w-full bg-base-200">
      <div
        ref={containerRef}
        className="absolute inset-0 rounded-lg border border-base-300 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full"
      />
      <button
        type="button"
        aria-label="Open map full screen"
        className="absolute top-3 right-3 z-1000 inline-flex h-8 w-8 items-center justify-center rounded-md border border-base-300 bg-base-100/95 text-base-content shadow-sm hover:bg-base-100"
        onClick={openFullscreen}
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}
