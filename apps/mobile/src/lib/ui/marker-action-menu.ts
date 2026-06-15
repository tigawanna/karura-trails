import { Alert } from "react-native";

import { presentMarkerActionMenu } from "@/components/map/marker-action-menu-host";

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

  presentMarkerActionMenu(input);
}

export function showMapLocationActionMenu(input: {
  title: string;
  actions: MarkerActionMenuItem[];
}) {
  showMarkerActionMenu({ markerLabel: input.title, actions: input.actions });
}

export function buildMapLocationActions(input: {
  onDropMarker: () => void;
  onSetLocationHere: () => void;
}): MarkerActionMenuItem[] {
  return [
    { label: "Drop a marker", onPress: input.onDropMarker },
    { label: "I am here", onPress: input.onSetLocationHere },
  ];
}

export function confirmStartNavigationTo(markerLabel: string, onConfirm: () => void) {
  Alert.alert(`Navigate to ${markerLabel}?`, "Start navigation to this marker?", [
    { text: "Cancel", style: "cancel" },
    { text: "Navigate", onPress: onConfirm },
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
  onNavigateFrom: () => void;
  onNavigateHereInstead: () => void;
  onRouteThroughHere: () => void;
  onRemoveFromRoute: () => void;
  onRemoveViaStop: () => void;
  onUnblockPoint: () => void;
  onViewDetails: () => void;
  onSetLocationHere: () => void;
}): MarkerActionMenuItem[] {
  const actions: MarkerActionMenuItem[] = [];

  if (!input.isNavigating) {
    actions.push({ label: "Navigate to here", onPress: input.onNavigateTo });
    if (!input.isOrigin) {
      actions.push({ label: "Navigate from here", onPress: input.onNavigateFrom });
    }
    actions.push({ label: "I am here", onPress: input.onSetLocationHere });
    actions.push({ label: "View details", onPress: input.onViewDetails });
    return actions;
  }

  if (!input.isOrigin) {
    actions.push({ label: "Navigate from here", onPress: input.onNavigateFrom });
  }

  actions.push({ label: "I am here", onPress: input.onSetLocationHere });

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
