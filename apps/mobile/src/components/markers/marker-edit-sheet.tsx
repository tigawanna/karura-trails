import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Modal, Portal, Switch, Text, TextInput, useTheme } from "react-native-paper";

import { MarkerCategoryPicker } from "@/components/markers/marker-category-picker";
import { readMarkerCategories } from "@/geo/marker-categories";
import { readMarkerSyncOptOut } from "@/geo/marker-sync";
import type { EnrichedRoutingPoint } from "@/geo/point-record";
import { useUpdateMarker } from "@/hooks/use-update-marker";
import type { PointCategory } from "@/lib/drizzle/schema/points";
import { Spacing } from "@/theme";

interface MarkerEditSheetProps {
  visible: boolean;
  marker: EnrichedRoutingPoint | null;
  onDismiss: () => void;
  onSaved: () => void;
}

export function MarkerEditSheet({ visible, marker, onDismiss, onSaved }: MarkerEditSheetProps) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<PointCategory[]>(["junction"]);
  const [keepLocalOnly, setKeepLocalOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateMutation = useUpdateMarker(() => {
    setErrorMessage(null);
    onSaved();
  });

  useEffect(() => {
    if (!marker || !visible) {
      return;
    }
    setName(marker.name ?? "");
    setDescription(marker.description ?? "");
    setCategories(readMarkerCategories(marker));
    setKeepLocalOnly(readMarkerSyncOptOut(marker.metadataJson));
    setErrorMessage(null);
  }, [marker, visible]);

  const isCapturedMarker = marker?.sourceId == null;
  const title = isCapturedMarker ? "Edit marker" : "Suggest a fix";
  const subtitle = isCapturedMarker
    ? "Update this marker on your device. Changes queue for sync."
    : "Propose corrections for this trail marker. An admin reviews before they go live for everyone.";

  const handleSave = () => {
    if (!marker) {
      return;
    }

    updateMutation.mutate(
      {
        pointId: marker.id,
        name: name.trim() || null,
        description: description.trim() || null,
        categories,
        syncOptOut: isCapturedMarker ? keepLocalOnly : undefined,
      },
      {
        onError: (error: unknown) => {
          setErrorMessage(error instanceof Error ? error.message : "Could not save changes.");
        },
      },
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <ScrollView contentContainerStyle={styles.content} testID="marker-edit-sheet">
          <Text variant="titleLarge" style={{ color: colors.onSurface }}>
            {title}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {subtitle}
          </Text>

          <MarkerCategoryPicker selected={categories} onChange={setCategories} />

          {isCapturedMarker ? (
            <View style={styles.localOnlyRow}>
              <View style={styles.localOnlyCopy}>
                <Text variant="labelLarge" style={{ color: colors.onSurface }}>
                  Keep on device only
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  When enabled, this marker is not shared with admins and will not be overwritten by
                  synced changes.
                </Text>
              </View>
              <Switch
                value={keepLocalOnly}
                onValueChange={setKeepLocalOnly}
                testID="marker-edit-keep-local-only"
              />
            </View>
          ) : null}

          <TextInput
            label="Name (optional)"
            value={name}
            onChangeText={setName}
            mode="outlined"
            testID="marker-edit-name"
          />
          <TextInput
            label="Notes (optional)"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            testID="marker-edit-description"
          />

          {errorMessage ? (
            <HelperText type="error" visible>
              {errorMessage}
            </HelperText>
          ) : null}

          <View style={styles.actions}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending}
              onPress={handleSave}
              testID="marker-edit-save"
            >
              Save
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
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
