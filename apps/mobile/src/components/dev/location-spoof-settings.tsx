import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Chip, Text, TextInput, useTheme } from "react-native-paper";

import { KARURA_FOREST_BBOX } from "@/geo/karura-bounds";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { KARURA_LOCATION_PRESETS } from "@/lib/dev/karura-location-presets";
import { Spacing } from "@/theme";

export function LocationSpoofSettings() {
  const { colors } = useTheme();
  const { location, isSpoofed, applySpoof, clearSpoof } = useDeviceLocation();
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");

  useEffect(() => {
    if (!location) {
      return;
    }
    setLatitudeInput(location.coords.latitude.toFixed(6));
    setLongitudeInput(location.coords.longitude.toFixed(6));
  }, [location]);

  const applyCustom = () => {
    const latitude = Number.parseFloat(latitudeInput);
    const longitude = Number.parseFloat(longitudeInput);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }
    void applySpoof?.(latitude, longitude);
  };

  const selectPreset = (latitude: number, longitude: number) => {
    setLatitudeInput(latitude.toFixed(6));
    setLongitudeInput(longitude.toFixed(6));
    void applySpoof?.(latitude, longitude);
  };

  return (
    <View style={styles.section} testID="location-spoof-settings">
      <Text variant="titleMedium" style={{ color: colors.onSurface }}>
        Simulate location
      </Text>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
        Places your GPS inside Karura for the map dot and on-trail sheet. Persists until you clear
        it.
      </Text>

      {isSpoofed ? (
        <Text variant="labelLarge" style={{ color: colors.primary }} testID="location-spoof-active">
          Simulated position active
        </Text>
      ) : null}

      <View style={styles.chips}>
        {KARURA_LOCATION_PRESETS.map((preset) => (
          <Chip
            key={preset.id}
            mode="outlined"
            onPress={() => selectPreset(preset.latitude, preset.longitude)}
            testID={`location-spoof-preset-${preset.id}`}
          >
            {preset.label}
          </Chip>
        ))}
      </View>

      <TextInput
        label="Latitude"
        value={latitudeInput}
        onChangeText={setLatitudeInput}
        keyboardType="numeric"
        mode="outlined"
        testID="location-spoof-latitude"
      />
      <TextInput
        label="Longitude"
        value={longitudeInput}
        onChangeText={setLongitudeInput}
        keyboardType="numeric"
        mode="outlined"
        testID="location-spoof-longitude"
      />

      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
        Karura bounds: lat {KARURA_FOREST_BBOX.minLat} to {KARURA_FOREST_BBOX.maxLat}, lng{" "}
        {KARURA_FOREST_BBOX.minLng} to {KARURA_FOREST_BBOX.maxLng}
      </Text>

      <View style={styles.actions}>
        <Button mode="contained" onPress={applyCustom} testID="location-spoof-apply">
          Apply coordinates
        </Button>
        <Button mode="outlined" onPress={() => void clearSpoof?.()} testID="location-spoof-use-gps">
          Use real GPS
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
});
