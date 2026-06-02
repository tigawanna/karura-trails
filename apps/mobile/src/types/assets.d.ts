declare module "*.geojson" {
  import type { TrailFeatureCollection } from "@/geo/geojson";

  const value: TrailFeatureCollection | string;
  export default value;
}

declare module "*.sql" {
  const value: string;
  export default value;
}
