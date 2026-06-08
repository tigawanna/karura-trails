import { resolveMapPointLinkRef } from "@/lib/map/map-point-link-ref";
import {
  analyzeNeighborRouteLegs,
  findTopNeighborRouteAlternatives,
  type AnalyzeNeighborRouteLegsResult,
  type FindNeighborPathResult,
  type NeighborRouteAlternativesResult,
} from "@/lib/map/neighbor-graph";
import type { MarkerNeighborRecord } from "@/types/map/marker-neighbors";
import type { MapPointRecord } from "@/types/map/map-points";
import { useCallback, useMemo, useState } from "react";

export type LinkRoutePickTarget = "start" | "end" | "via" | null;

type UseLinkRoutePlannerOptions = {
  mapPoints: MapPointRecord[];
  markerNeighbors: MarkerNeighborRecord[];
  onApplyChain: (pointIds: number[]) => void;
  onStatusMessage?: (message: string | null) => void;
};

export function useLinkRoutePlanner({
  mapPoints,
  markerNeighbors,
  onApplyChain,
  onStatusMessage,
}: UseLinkRoutePlannerOptions) {
  const [pickTarget, setPickTarget] = useState<LinkRoutePickTarget>(null);
  const [startId, setStartId] = useState<number | null>(null);
  const [endId, setEndId] = useState<number | null>(null);
  const [viaIds, setViaIds] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<FindNeighborPathResult | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<AnalyzeNeighborRouteLegsResult | null>(null);

  const liveAnalysis = useMemo(() => {
    if (startId === null || endId === null) {
      return null;
    }
    return analyzeNeighborRouteLegs({
      mapPoints,
      neighbors: markerNeighbors,
      fromPointId: startId,
      toPointId: endId,
      viaPointIds: viaIds,
    });
  }, [endId, mapPoints, markerNeighbors, startId, viaIds]);

  const routeAlternatives = useMemo((): NeighborRouteAlternativesResult | null => {
    if (startId === null || endId === null) {
      return null;
    }
    return findTopNeighborRouteAlternatives({
      mapPoints,
      neighbors: markerNeighbors,
      fromPointId: startId,
      toPointId: endId,
      viaPointIds: viaIds,
      limit: 3,
    });
  }, [endId, mapPoints, markerNeighbors, startId, viaIds]);

  const clear = useCallback(() => {
    setPickTarget(null);
    setStartId(null);
    setEndId(null);
    setViaIds([]);
    setLastResult(null);
    setLastAnalysis(null);
  }, []);

  const assignPoint = useCallback(
    (target: Exclude<LinkRoutePickTarget, null>, pointId: number) => {
      setLastResult(null);
      if (target === "start") {
        setStartId(pointId);
        setViaIds((current) => current.filter((id) => id !== pointId));
        if (endId === pointId) {
          setEndId(null);
        }
        return;
      }
      if (target === "end") {
        setEndId(pointId);
        setViaIds((current) => current.filter((id) => id !== pointId));
        if (startId === pointId) {
          setStartId(null);
        }
        return;
      }
      if (pointId === startId || pointId === endId || viaIds.includes(pointId)) {
        return;
      }
      setViaIds((current) => [...current, pointId]);
    },
    [endId, startId, viaIds],
  );

  const handleMapPointClickForRoutePick = useCallback(
    (pointId: number): boolean => {
      if (!pickTarget) {
        return false;
      }
      assignPoint(pickTarget, pointId);
      setPickTarget(null);
      const point = mapPoints.find((entry) => entry.id === pointId);
      onStatusMessage?.(
        `Picked ${pickTarget}: ${point ? resolveMapPointLinkRef(point) : String(pointId)}`,
      );
      return true;
    },
    [assignPoint, mapPoints, onStatusMessage, pickTarget],
  );

  const calculatePath = useCallback(() => {
    if (startId === null || endId === null) {
      onStatusMessage?.("Select start and end markers first.");
      return;
    }

    const result = analyzeNeighborRouteLegs({
      mapPoints,
      neighbors: markerNeighbors,
      fromPointId: startId,
      toPointId: endId,
      viaPointIds: viaIds,
    });

    setLastAnalysis(result);
    setLastResult(result.merged);

    if (!result.merged.found) {
      onStatusMessage?.("No path found between the selected markers.");
      return;
    }

    onApplyChain(result.merged.pointIds);
    onStatusMessage?.(`Route calculated with ${result.merged.pointIds.length} markers.`);
  }, [endId, mapPoints, markerNeighbors, onApplyChain, onStatusMessage, startId, viaIds]);

  const removeVia = useCallback((pointId: number) => {
    setViaIds((current) => current.filter((id) => id !== pointId));
    setLastResult(null);
  }, []);

  return {
    pickTarget,
    setPickTarget,
    startId,
    endId,
    viaIds,
    lastResult,
    lastAnalysis,
    liveAnalysis,
    routeAlternatives,
    clear,
    assignPoint,
    removeVia,
    handleMapPointClickForRoutePick,
    calculatePath,
  };
}
