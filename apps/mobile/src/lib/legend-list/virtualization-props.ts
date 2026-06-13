export const LEGEND_LIST_MAX_PRELOAD_ROWS = 20;

type LegendListOrientation = "horizontal" | "vertical";

export function legendListVirtualizationProps(
  estimatedItemSize: number,
  orientation: LegendListOrientation = "vertical",
) {
  const preloadSpan = estimatedItemSize * LEGEND_LIST_MAX_PRELOAD_ROWS;

  return {
    estimatedItemSize,
    drawDistance: 0,
    estimatedListSize:
      orientation === "horizontal"
        ? { width: preloadSpan, height: 0 }
        : { height: preloadSpan, width: 0 },
  };
}
