export interface KaruraLocationPreset {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

export const KARURA_LOCATION_PRESETS: KaruraLocationPreset[] = [
  {
    id: "center",
    label: "Forest center",
    latitude: -1.2376,
    longitude: 36.8193,
  },
  {
    id: "east",
    label: "East trails",
    latitude: -1.235,
    longitude: 36.835,
  },
  {
    id: "west",
    label: "West trails",
    latitude: -1.244,
    longitude: 36.802,
  },
  {
    id: "north",
    label: "North edge",
    latitude: -1.226,
    longitude: 36.818,
  },
  {
    id: "south",
    label: "South edge",
    latitude: -1.248,
    longitude: 36.82,
  },
];
