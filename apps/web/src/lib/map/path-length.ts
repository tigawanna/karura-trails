import { haversineDistanceMeters } from "@/lib/map/geo";

export function pathLengthMeters(coordinates: [number, number][]): number {
  let total = 0;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const from = coordinates[index];
    const to = coordinates[index + 1];
    if (!from || !to) {
      continue;
    }
    total += haversineDistanceMeters(from[1], from[0], to[1], to[0]);
  }
  return total;
}
