export const SHORTCUT_CATEGORIES = ["global", "mapWorkspace", "mapTips"] as const;

export type ShortcutCategory = (typeof SHORTCUT_CATEGORIES)[number];

export type ShortcutDefinition = {
  id: string;
  hotkey: string;
  label: string;
  categories: ShortcutCategory[];
};

export type MapTipItem = {
  label: string;
  swatch?: "green-diamond" | "teal-endpoint" | "purple-dead-end" | "amber-glow" | "dash-preview";
};
