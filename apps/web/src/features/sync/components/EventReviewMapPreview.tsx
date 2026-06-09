import type { EventMapPreview } from "@/lib/sync/event-map-preview";
import { KARURA_MAP_VIEWPORT } from "@/lib/map/karura-map-defaults";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type EventReviewMapPreviewProps = {
  preview: EventMapPreview;
};

export function EventReviewMapPreview({ preview }: EventReviewMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    map.eachLayer((layer) => {
      if (
        layer instanceof L.Marker ||
        layer instanceof L.Polyline ||
        layer instanceof L.CircleMarker
      ) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);
    for (const point of preview.points) {
      const latLng = L.latLng(point.latitude, point.longitude);
      bounds.extend(latLng);
      L.circleMarker(latLng, {
        radius: point.emphasis ? 8 : 6,
        color: point.emphasis ? "#7c3aed" : "#2563eb",
        fillColor: point.emphasis ? "#7c3aed" : "#2563eb",
        fillOpacity: 0.85,
        weight: 2,
      })
        .bindTooltip(point.label)
        .addTo(map);
    }

    for (const edge of preview.edges) {
      const line = L.polyline(
        [
          [edge.from.latitude, edge.from.longitude],
          [edge.to.latitude, edge.to.longitude],
        ],
        { color: "#7c3aed", weight: 3, dashArray: "6 4" },
      );
      line.addTo(map);
      bounds.extend([edge.from.latitude, edge.from.longitude]);
      bounds.extend([edge.to.latitude, edge.to.longitude]);
    }

    if (preview.points.length > 0) {
      map.fitBounds(bounds.pad(0.35));
    } else {
      map.setView(
        [KARURA_MAP_VIEWPORT.latitude, KARURA_MAP_VIEWPORT.longitude],
        KARURA_MAP_VIEWPORT.zoom,
      );
    }
  }, [preview]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[280px] w-full rounded-lg border border-base-300"
    />
  );
}
