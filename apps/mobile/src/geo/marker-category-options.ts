import type { PointCategory } from "@/lib/drizzle/schema/points";

export const MARKER_CATEGORY_OPTIONS: { value: PointCategory; label: string }[] = [
  { value: "junction", label: "Junction" },
  { value: "gate", label: "Gate" },
  { value: "viewpoint", label: "Viewpoint" },
  { value: "water", label: "Water" },
  { value: "lake", label: "Lake" },
  { value: "river", label: "River" },
  { value: "bridge", label: "Bridge" },
  { value: "cave", label: "Cave" },
  { value: "rest_area", label: "Rest area" },
  { value: "bench", label: "Bench" },
  { value: "dustbin", label: "Dustbin" },
  { value: "sign", label: "Sign" },
  { value: "custom", label: "Custom" },
];
