import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton, Portal, Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MapBasemapPreset } from "@/types/map";
import { Spacing } from "@/theme";

interface MapBasemapToggleProps {
  preset: MapBasemapPreset;
  onPresetChange: (preset: MapBasemapPreset) => void;
}

export function MapBasemapToggle({ preset, onPresetChange }: MapBasemapToggleProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selectPreset = (next: MapBasemapPreset) => {
    setOpen(false);
    onPresetChange(next);
  };

  const menuTop = insets.top + 52;
  const menuRight = insets.right + 8;

  return (
    <>
      <View
        style={[styles.trigger, { top: insets.top + 8, right: insets.right + 8 }]}
        testID="map-basemap-toggle"
      >
        <IconButton
          icon="layers"
          mode="contained"
          containerColor={colors.surface}
          iconColor={colors.onSurface}
          size={22}
          onPress={() => setOpen(true)}
          testID="map-basemap-toggle-button"
        />
      </View>

      {open ? (
        <Portal>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close map style menu"
            testID="map-basemap-backdrop"
          />
          <Surface
            style={[
              styles.menu,
              {
                top: menuTop,
                right: menuRight,
                backgroundColor: colors.surface,
              },
            ]}
            elevation={4}
            testID="map-basemap-menu"
          >
            <BasemapOption
              label="Minimal"
              selected={preset === "minimal"}
              onPress={() => selectPreset("minimal")}
              testID="map-basemap-option-minimal"
            />
            <BasemapOption
              label="Standard (OSM)"
              selected={preset === "standard"}
              onPress={() => selectPreset("standard")}
              testID="map-basemap-option-standard"
            />
          </Surface>
        </Portal>
      ) : null}
    </>
  );
}

interface BasemapOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}

function BasemapOption({ label, selected, onPress, testID }: BasemapOptionProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      testID={testID}
    >
      <Text variant="bodyLarge" style={{ color: colors.onSurface, flex: 1 }}>
        {label}
      </Text>
      {selected ? (
        <Text variant="bodyLarge" style={{ color: colors.primary }}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  menu: {
    position: "absolute",
    zIndex: 31,
    minWidth: 200,
    borderRadius: Spacing.two,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  optionPressed: {
    opacity: 0.7,
  },
});
