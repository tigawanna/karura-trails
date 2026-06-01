import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import { AppColors } from "./md3-colors";
import type { MD3SchemeColors, MD3Theme } from "./types";

type ExpoRouterModule = {
  Material3DynamicColor: (name: string, scheme: string) => string;
};

const MD3_COLOR_ROLES = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "background",
  "onBackground",
  "surface",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "outline",
  "outlineVariant",
  "surfaceContainer",
  "surfaceContainerLow",
  "surfaceContainerLowest",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "surfaceBright",
  "surfaceDim",
] as const;

const INVERSE_ROLES_MAP: Record<string, string> = {
  surfaceInverse: "inverseSurface",
  onSurfaceInverse: "inverseOnSurface",
  primaryInverse: "inversePrimary",
};

const EXPO_ROUTER_INVERSE_NAMES = ["surfaceInverse", "onSurfaceInverse", "primaryInverse"] as const;

function getExpoRouterModule(): ExpoRouterModule | null {
  try {
    return requireNativeModule<ExpoRouterModule>("ExpoRouter");
  } catch {
    return null;
  }
}

function resolveColorFromNative(
  nativeModule: ExpoRouterModule,
  name: string,
  scheme: string,
): string | null {
  try {
    return nativeModule.Material3DynamicColor(name, scheme);
  } catch {
    return null;
  }
}

function mixColors(base: string, overlay: string, amount: number): string {
  const parseHex = (hex: string) => {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  };

  const b = parseHex(base);
  const o = parseHex(overlay);

  const r = Math.round(b.r + (o.r - b.r) * amount);
  const g = Math.round(b.g + (o.g - b.g) * amount);
  const bl = Math.round(b.b + (o.b - b.b) * amount);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function buildSchemeFromNative(
  nativeModule: ExpoRouterModule,
  scheme: string,
): MD3SchemeColors | null {
  const colors: Record<string, string> = {};

  for (const role of MD3_COLOR_ROLES) {
    const value = resolveColorFromNative(nativeModule, role, scheme);
    if (!value) return null;
    colors[role] = value;
  }

  for (const expoName of EXPO_ROUTER_INVERSE_NAMES) {
    const paperName = INVERSE_ROLES_MAP[expoName];
    const value = resolveColorFromNative(nativeModule, expoName, scheme);
    if (value && paperName) {
      colors[paperName] = value;
    }
  }

  const surface = colors["surface"] ?? "#000000";
  const primary = colors["primary"] ?? "#000000";
  const onSurface = colors["onSurface"] ?? "#FFFFFF";

  return {
    ...colors,
    shadow: colors["shadow"] ?? "#000000",
    scrim: colors["scrim"] ?? "#000000",
    inverseSurface: colors["inverseSurface"] ?? AppColors.light.inverseSurface,
    inverseOnSurface: colors["inverseOnSurface"] ?? AppColors.light.inverseOnSurface,
    inversePrimary: colors["inversePrimary"] ?? AppColors.light.inversePrimary,
    surfaceTint: primary,
    elevation: {
      level0: "transparent",
      level1: mixColors(surface, primary, 0.05),
      level2: mixColors(surface, primary, 0.08),
      level3: mixColors(surface, primary, 0.11),
      level4: mixColors(surface, primary, 0.12),
      level5: mixColors(surface, primary, 0.14),
    },
    surfaceDisabled: `rgba(${hexToRgbComponents(onSurface)}, 0.12)`,
    onSurfaceDisabled: `rgba(${hexToRgbComponents(onSurface)}, 0.38)`,
    backdrop: `rgba(${hexToRgbComponents(colors["onSurfaceVariant"] ?? "#000000")}, 0.4)`,
  } as MD3SchemeColors;
}

function hexToRgbComponents(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function getMaterialDynamicTheme(): MD3Theme {
  if (Platform.OS !== "android" || Platform.Version < 31) {
    return AppColors;
  }

  const nativeModule = getExpoRouterModule();
  if (!nativeModule) {
    return AppColors;
  }

  const lightColors = buildSchemeFromNative(nativeModule, "light");
  const darkColors = buildSchemeFromNative(nativeModule, "dark");

  if (!lightColors || !darkColors) {
    return AppColors;
  }

  return { light: lightColors, dark: darkColors };
}

export function isDynamicColorSupported(): boolean {
  return Platform.OS === "android" && Platform.Version >= 31 && getExpoRouterModule() !== null;
}
