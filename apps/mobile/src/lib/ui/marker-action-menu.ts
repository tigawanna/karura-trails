import { ActionSheetIOS, Alert, Platform } from "react-native";

export type MarkerActionMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export function showMarkerActionMenu(input: {
  markerLabel: string;
  actions: MarkerActionMenuItem[];
}) {
  if (input.actions.length === 0) {
    return;
  }

  const options = [...input.actions.map((action) => action.label), "Cancel"];
  const cancelIndex = options.length - 1;
  const destructiveButtonIndex = input.actions.findIndex((action) => action.destructive);

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: input.markerLabel,
        options,
        cancelButtonIndex: cancelIndex,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelIndex || buttonIndex === undefined) {
          return;
        }
        input.actions[buttonIndex]?.onPress();
      },
    );
    return;
  }

  Alert.alert(input.markerLabel, undefined, [
    ...input.actions.map((action) => ({
      text: action.label,
      style: action.destructive ? ("destructive" as const) : ("default" as const),
      onPress: action.onPress,
    })),
    { text: "Cancel", style: "cancel" as const },
  ]);
}

export function buildMarkerNavigationActions(input: {
  markerId: number;
  isNavigating: boolean;
  isOrigin: boolean;
  isDestination: boolean;
  isOnActiveRoute: boolean;
  isViaPoint: boolean;
  isBlockedPoint: boolean;
  onNavigateTo: () => void;
  onNavigateHereInstead: () => void;
  onRouteThroughHere: () => void;
  onRemoveFromRoute: () => void;
  onRemoveViaStop: () => void;
  onUnblockPoint: () => void;
  onViewDetails: () => void;
}): MarkerActionMenuItem[] {
  const actions: MarkerActionMenuItem[] = [];

  if (!input.isNavigating) {
    actions.push({ label: "Navigate to", onPress: input.onNavigateTo });
    actions.push({ label: "View details", onPress: input.onViewDetails });
    return actions;
  }

  if (!input.isDestination && !input.isOrigin) {
    actions.push({ label: "Navigate here instead", onPress: input.onNavigateHereInstead });
    if (!input.isViaPoint) {
      actions.push({ label: "Route through here", onPress: input.onRouteThroughHere });
    }
  }

  if (input.isViaPoint) {
    actions.push({
      label: "Remove via stop",
      onPress: input.onRemoveViaStop,
      destructive: true,
    });
  }

  if (input.isOnActiveRoute && !input.isOrigin && !input.isDestination && !input.isViaPoint) {
    actions.push({
      label: "Avoid this point",
      onPress: input.onRemoveFromRoute,
      destructive: true,
    });
  }

  if (input.isBlockedPoint) {
    actions.push({ label: "Allow this point again", onPress: input.onUnblockPoint });
  }

  actions.push({ label: "View details", onPress: input.onViewDetails });
  return actions;
}
