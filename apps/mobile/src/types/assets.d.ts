declare module "*.geojson" {
  import type { TrailFeatureCollection } from "./geojson";

  const value: TrailFeatureCollection | string;
  export default value;
}
