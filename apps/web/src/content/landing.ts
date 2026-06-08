import { Compass, MapPin, RefreshCw, ShieldCheck, TreePine, WifiOff } from "lucide-react";

export const landingNav = {
  status: "Offline maps · Field sync",
  links: [
    { label: "Capabilities", href: "#capabilities" },
    { label: "Why Karura", href: "#why" },
  ],
} as const;

export const landingHero = {
  eyebrow: "Karura Forest · Offline-first",
  title: "Every trail, mapped. Even off the grid.",
  description:
    "Karura Trails turns the forest into a navigable offline map. Hike with confidence, drop field markers where they matter, and sync verified updates so every trail stays accurate.",
  primaryCta: "Get the app",
  secondaryCta: "Open dashboard",
  mapPanel: {
    fileLabel: "karura.trails",
    pathLabel: "/forest/network",
    coords: "-1.2419, 36.8186",
    legend: [
      { label: "Trail", tone: "primary" },
      { label: "Junction", tone: "info" },
      { label: "Viewpoint", tone: "warning" },
    ],
  },
  navPanel: {
    title: "River Trail Loop",
    distance: "4.2 km",
    elevation: "+86 m",
    eta: "1h 05m",
  },
} as const;

export const landingCapabilities = {
  heading: "From the canopy to the dashboard",
  description:
    "A single trail network, two surfaces. The mobile app works in the field without signal; the web hub keeps every edit reviewed and trustworthy.",
  steps: [
    {
      id: "01",
      label: "OFFLINE MAPS",
      icon: WifiOff,
      title: "Maps that work without signal",
      description:
        "MapLibre vector tiles and a SpatiaLite database ship on-device. The full trail network, elevation, and points of interest stay available deep under the canopy.",
    },
    {
      id: "02",
      label: "FIELD CAPTURE",
      icon: MapPin,
      title: "Drop markers where they matter",
      description:
        "Rangers and hikers capture junctions, hazards, and viewpoints with GPS precision, then attach notes on the spot — no connection required.",
    },
    {
      id: "03",
      label: "SYNC HUB",
      icon: RefreshCw,
      title: "Reviewed, then synced",
      description:
        "Field edits flow to the admin hub as an append-only event log. Admins verify each change before it reaches every device in the forest.",
    },
  ],
} as const;

export const landingReasons = {
  heading: "Built for the forest, not the office",
  description:
    "Connectivity drops the moment you leave the gate. Karura Trails is designed around that reality from the first tile to the last sync.",
  items: [
    {
      icon: Compass,
      title: "Offline-first by design",
      description:
        "Navigation, search, and marker capture run entirely on-device. The network is an enhancement, never a requirement.",
    },
    {
      icon: ShieldCheck,
      title: "A single source of truth",
      description:
        "Every change is an event. Admins verify before it propagates, so the map a hiker trusts is the map that was approved.",
    },
    {
      icon: TreePine,
      title: "Field-grade accuracy",
      description:
        "Markers carry GPS coordinates, elevation, and context captured in place — not guessed later from a desk.",
    },
  ],
} as const;

export const landingCta = {
  title: "Find your way through Karura",
  highlight: "Karura",
  description:
    "Sign in to the admin hub to review field edits and manage the trail network, or grab the mobile app to start navigating offline.",
  primaryCta: "Open dashboard",
  secondaryCta: "Create an account",
} as const;

export const landingFooter = {
  tagline: "Offline maps · Field capture · Verified sync",
} as const;
