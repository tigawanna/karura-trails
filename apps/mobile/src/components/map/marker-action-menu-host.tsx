import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import type { MarkerActionMenuItem } from "@/lib/ui/marker-action-menu";
import { Spacing } from "@/theme";

type MenuRequest = {
  markerLabel: string;
  actions: MarkerActionMenuItem[];
};

let presentMenu: ((request: MenuRequest) => void) | null = null;

export function presentMarkerActionMenu(request: MenuRequest) {
  presentMenu?.(request);
}

export function MarkerActionMenuHost() {
  const { colors } = useTheme();
  const [menu, setMenu] = useState<MenuRequest | null>(null);

  useEffect(() => {
    presentMenu = setMenu;
    return () => {
      presentMenu = null;
    };
  }, []);

  const dismiss = () => setMenu(null);

  if (!menu) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      testID="marker-action-menu-modal"
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
          onPress={dismiss}
          testID="marker-action-menu-backdrop"
        />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text
            variant="titleMedium"
            style={[styles.title, { color: colors.onSurface }]}
            numberOfLines={2}
          >
            {menu.markerLabel}
          </Text>
          {menu.actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                dismiss();
                action.onPress();
              }}
              style={styles.actionRow}
              testID={`marker-action-menu-item-${action.label.replace(/\s+/g, "-").toLowerCase()}`}
            >
              <Text
                variant="bodyLarge"
                style={{
                  color: action.destructive ? colors.error : colors.primary,
                  fontWeight: "600",
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={dismiss}
            style={[styles.cancelRow, { borderTopColor: colors.outlineVariant }]}
            testID="marker-action-menu-cancel"
          >
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, fontWeight: "600" }}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  title: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.three,
    fontWeight: "700",
  },
  actionRow: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  cancelRow: {
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    alignItems: "center",
  },
});
