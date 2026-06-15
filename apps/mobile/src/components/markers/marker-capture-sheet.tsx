import { Image } from "expo-image";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  HelperText,
  IconButton,
  Modal,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { MarkerCategoryPicker } from "@/components/markers/marker-category-picker";
import { useMarkerCapture, type MarkerCaptureDraft } from "@/hooks/use-marker-capture";
import { Spacing } from "@/theme";

interface MarkerCaptureSheetProps {
  visible: boolean;
  initialDraft: MarkerCaptureDraft | null;
  onDismiss: () => void;
  onSaved: () => void;
  onUseGps: () => void;
}

export function MarkerCaptureSheet({
  visible,
  initialDraft,
  onDismiss,
  onSaved,
  onUseGps,
}: MarkerCaptureSheetProps) {
  const { colors } = useTheme();
  const capture = useMarkerCapture({ initialDraft, onSaved });

  useEffect(() => {
    if (capture.errorMessage) {
      console.log("[MarkerCaptureSheet] save error:", capture.errorMessage);
    }
  }, [capture.errorMessage]);

  const handleUseGps = () => {
    onUseGps();
  };

  const elevationHint = useMemo(() => {
    if (capture.elevationTouched) {
      return "Manual elevation";
    }
    if (capture.resolvedElevation.elevationSource === "gps") {
      return "From device altitude (verify on map)";
    }
    if (capture.resolvedElevation.elevationSource === "inferred_from_path") {
      return "Estimated from nearest trail";
    }
    return "No elevation available yet";
  }, [capture.elevationTouched, capture.resolvedElevation.elevationSource]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <ScrollView contentContainerStyle={styles.content} testID="marker-capture-sheet">
          <Text variant="titleLarge" style={{ color: colors.onSurface }}>
            Record marker
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Position the pin on the map, then adjust coordinates if GPS looks off.
          </Text>

          <Button
            mode="outlined"
            onPress={handleUseGps}
            icon="crosshairs-gps"
            testID="marker-capture-use-gps"
          >
            Use my location
          </Button>

          <View style={styles.row}>
            <TextInput
              label="Latitude"
              value={capture.lat}
              onChangeText={capture.setLat}
              keyboardType="numeric"
              mode="outlined"
              style={styles.halfInput}
              testID="marker-capture-lat"
            />
            <TextInput
              label="Longitude"
              value={capture.lng}
              onChangeText={capture.setLng}
              keyboardType="numeric"
              mode="outlined"
              style={styles.halfInput}
              testID="marker-capture-lng"
            />
          </View>

          <TextInput
            label="Elevation (m)"
            value={capture.displayElevation}
            onChangeText={capture.setManualElevation}
            keyboardType="numeric"
            mode="outlined"
            testID="marker-capture-elevation"
          />
          <HelperText type="info" visible>
            {elevationHint}
          </HelperText>

          <MarkerCategoryPicker selected={capture.categories} onChange={capture.setCategories} />

          <View style={styles.localOnlyRow}>
            <View style={styles.localOnlyCopy}>
              <Text variant="labelLarge" style={{ color: colors.onSurface }}>
                Keep on device only
              </Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                This marker stays on your phone and is not sent for admin review.
              </Text>
            </View>
            <Switch
              value={capture.keepLocalOnly}
              onValueChange={capture.setKeepLocalOnly}
              testID="marker-capture-keep-local-only"
            />
          </View>

          <TextInput
            label="Name (optional)"
            value={capture.name}
            onChangeText={capture.setName}
            mode="outlined"
            testID="marker-capture-name"
          />
          <TextInput
            label="Notes (optional)"
            value={capture.description}
            onChangeText={capture.setDescription}
            mode="outlined"
            multiline
            testID="marker-capture-description"
          />

          <View style={styles.photoHeader}>
            <Text variant="labelLarge" style={{ color: colors.onSurface }}>
              Photos (up to 2)
            </Text>
            <Button
              mode="outlined"
              onPress={() => void capture.pickPhoto()}
              disabled={capture.photoUris.length >= 2}
            >
              Take photo
            </Button>
          </View>

          <View style={styles.photoRow}>
            {capture.photoUris.map((uri) => (
              <View key={uri} style={styles.photoCard}>
                <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                <IconButton icon="close" size={18} onPress={() => capture.removePhoto(uri)} />
              </View>
            ))}
          </View>

          {capture.errorMessage ? (
            <HelperText type="error" visible>
              {capture.errorMessage}
            </HelperText>
          ) : null}

          <View style={styles.actions}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={capture.isSaving}
              disabled={capture.isSaving}
              onPress={() => capture.save()}
              testID="marker-capture-save"
            >
              Save marker
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.six,
    borderRadius: 16,
    maxHeight: "88%",
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  halfInput: {
    flex: 1,
  },
  localOnlyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  localOnlyCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  photoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  photoCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
