import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { DrawerActions, useNavigation } from "expo-router/react-navigation";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Badge, IconButton, Portal, Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pendingSyncCountQueryOptions } from "@/data-access-layer/sync-queue";
import { Spacing } from "@/theme";

interface MapAppMenuProps {
  onAddMarker: () => void;
}

export function MapAppMenu({ onAddMarker }: MapAppMenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const { data: pendingCount = 0 } = useQuery(pendingSyncCountQueryOptions);

  const menuTop = insets.top + 52;
  const menuLeft = insets.left + 8;

  const close = () => setOpen(false);

  const openMenu = () => {
    router.prefetch("/trails");
    router.prefetch("/sync-queue");
    setOpen(true);
  };

  const navigate = (path: "/trails" | "/sync-queue") => {
    close();
    router.push(path);
  };

  return (
    <>
      <View
        style={[styles.trigger, { top: insets.top + 8, left: insets.left + 8 }]}
        testID="map-app-menu"
      >
        <IconButton
          icon={({ size, color }) => <MaterialCommunityIcons name="menu" size={size} color={color} />}
          mode="contained"
          containerColor={colors.surface}
          iconColor={colors.onSurface}
          size={22}
          onPress={openMenu}
          testID="map-app-menu-button"
        />
        {pendingCount > 0 ? (
          <Badge style={styles.badge} size={18} testID="map-app-menu-pending-badge">
            {pendingCount > 99 ? "99+" : pendingCount}
          </Badge>
        ) : null}
      </View>

      {open ? (
        <Portal>
          <Pressable
            style={styles.backdrop}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close app menu"
            testID="map-app-menu-backdrop"
          />
          <Surface
            style={[
              styles.menu,
              {
                top: menuTop,
                left: menuLeft,
                backgroundColor: colors.surface,
              },
            ]}
            elevation={4}
            testID="map-app-menu-panel"
          >
            <MenuOption
              label="View all markers"
              onPress={() => navigate("/trails")}
              testID="map-app-menu-markers"
            />
            <MenuOption
              label={
                pendingCount > 0 ? `Pending sync (${pendingCount})` : "Pending sync"
              }
              onPress={() => navigate("/sync-queue")}
              testID="map-app-menu-sync-queue"
            />
            <MenuOption
              label="Add marker"
              onPress={() => {
                close();
                onAddMarker();
              }}
              testID="map-app-menu-add-marker"
            />
            <MenuOption
              label="Settings & more"
              onPress={() => {
                close();
                navigation.dispatch(DrawerActions.openDrawer());
              }}
              testID="map-app-menu-drawer"
            />
          </Surface>
        </Portal>
      ) : null}
    </>
  );
}

interface MenuOptionProps {
  label: string;
  onPress: () => void;
  testID: string;
}

function MenuOption({ label, onPress, testID }: MenuOptionProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      testID={testID}
    >
      <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  menu: {
    position: "absolute",
    zIndex: 31,
    minWidth: 220,
    borderRadius: Spacing.two,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  optionPressed: {
    opacity: 0.7,
  },
});
