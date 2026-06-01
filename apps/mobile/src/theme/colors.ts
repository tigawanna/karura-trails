import "@/global.css";

import { Color } from "expo-router";
import { Platform, type ColorSchemeName, type ColorValue } from "react-native";

import { AppColors } from "./md3-colors";

export const Colors = {
  light: {
    text: AppColors.light.onBackground,
    background: AppColors.light.background,
    backgroundElement: AppColors.light.surfaceContainerHigh,
    backgroundSelected: AppColors.light.surfaceContainerHighest,
    textSecondary: AppColors.light.onSurfaceVariant,
    tint: AppColors.light.primary,
    icon: AppColors.light.onSurfaceVariant,
    card: AppColors.light.surfaceContainerHigh,
    cardBorder: AppColors.light.outlineVariant,
    onPrimary: AppColors.light.onPrimary,
  },
  dark: {
    text: AppColors.dark.onBackground,
    background: AppColors.dark.background,
    backgroundElement: AppColors.dark.surfaceContainerHigh,
    backgroundSelected: AppColors.dark.surfaceContainerHighest,
    textSecondary: AppColors.dark.onSurfaceVariant,
    tint: AppColors.dark.primary,
    icon: AppColors.dark.onSurfaceVariant,
    card: AppColors.dark.surfaceContainerHigh,
    cardBorder: AppColors.dark.outlineVariant,
    onPrimary: AppColors.dark.onPrimary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

const androidDynamic = Color.android.dynamic;

const androidThemeColors = {
  text: androidDynamic.onBackground,
  background: androidDynamic.background,
  backgroundElement: androidDynamic.surfaceContainerHigh,
  backgroundSelected: androidDynamic.surfaceContainerHighest,
  textSecondary: androidDynamic.onSurfaceVariant,
  tint: androidDynamic.primary,
  icon: androidDynamic.onSurfaceVariant,
  card: androidDynamic.surfaceContainerHigh,
  cardBorder: androidDynamic.outlineVariant,
  onPrimary: androidDynamic.onPrimary,
} satisfies Record<keyof typeof Colors.light, ColorValue>;

export function getThemeColor(
  colorName: keyof typeof Colors.light,
  colorScheme?: ColorSchemeName | null,
): ColorValue {
  if (Platform.OS === "android") {
    return androidThemeColors[colorName];
  }
  const theme = colorScheme === "dark" ? "dark" : "light";
  return Colors[theme][colorName];
}

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
