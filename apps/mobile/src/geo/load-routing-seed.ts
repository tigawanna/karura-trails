import type { RoutingGraphSeedJson } from "@/geo/routing-graph-seed.types";

import rawSeed from "../../assets/data/karura-trails.json";

function isRoutingGraphSeed(value: unknown): value is RoutingGraphSeedJson {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as RoutingGraphSeedJson;
  return (
    candidate.format === "agentic-routing-graph-seed" &&
    candidate.points?.type === "FeatureCollection" &&
    Array.isArray(candidate.points.features) &&
    Array.isArray(candidate.neighbors)
  );
}

export function loadRoutingGraphSeed(): RoutingGraphSeedJson {
  let data: unknown = rawSeed;

  if (typeof data === "string") {
    data = JSON.parse(data) as unknown;
  }

  if (data && typeof data === "object" && "default" in data) {
    data = (data as { default: unknown }).default;
  }

  if (!isRoutingGraphSeed(data)) {
    throw new Error(
      "karura-trails.json is not a valid routing graph seed. Rebuild the app (expo start -c).",
    );
  }

  return data;
}
