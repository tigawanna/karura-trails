export type LandmarkTypeRecord = {
  id: number;
  sourceId: number | null;
  slug: string;
  label: string;
  sortOrder: number;
};

export const SUGGESTED_LANDMARK_TYPES: Array<{ slug: string; label: string }> = [
  { slug: "bridge", label: "Bridge" },
  { slug: "waterfall", label: "Waterfall" },
  { slug: "toilet", label: "Toilet / loo" },
  { slug: "bench", label: "Bench" },
  { slug: "dustbin", label: "Dustbin" },
  { slug: "lake", label: "Lake" },
  { slug: "river", label: "River" },
  { slug: "viewpoint", label: "Viewpoint" },
  { slug: "cave", label: "Cave" },
  { slug: "water", label: "Water" },
  { slug: "picnic", label: "Picnic area" },
  { slug: "parking", label: "Parking" },
  { slug: "gate", label: "Gate" },
  { slug: "sign", label: "Sign / guidepost" },
  { slug: "rest_area", label: "Rest area" },
  { slug: "memorial", label: "Memorial" },
  { slug: "trail_junction", label: "Trail junction" },
  { slug: "information", label: "Information" },
];
