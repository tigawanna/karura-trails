import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import { useMarkerLoadStatus, useReloadMarkerData } from "@/hooks/use-resume-marker-load";
import { Spacing } from "@/theme";

export function MarkerLoadSettings() {
  const { colors } = useTheme();
  const statusQuery = useMarkerLoadStatus();
  const reloadMutation = useReloadMarkerData();

  const status = statusQuery.data;
  const needsAttention = status?.needsAttention ?? false;

  return (
    <View style={styles.section} testID="marker-load-settings">
      <View style={styles.text}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>
          Trail markers
        </Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          Wipe the local map database and replay saved marker payloads from on-device storage.
          Captured markers and pending sync entries are removed.
        </Text>
        {status ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Replay cache: {status.replayEventCount} events
            {status.replayCacheGeneratedAt
              ? `, saved ${new Date(status.replayCacheGeneratedAt).toLocaleString()}`
              : ""}
            .
            {needsAttention
              ? ` ${status.remainingUnapplied} pending and ${status.remainingSkipped} skipped updates detected.`
              : ""}
          </Text>
        ) : null}
        {reloadMutation.data ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Replayed {reloadMutation.data.replayEventCount} events and applied{" "}
            {reloadMutation.data.applied} update
            {reloadMutation.data.applied === 1 ? "" : "s"}
            {reloadMutation.data.remoteApplied > 0
              ? `, including ${reloadMutation.data.remoteApplied} from the server`
              : ""}
            .
          </Text>
        ) : null}
        {reloadMutation.error ? (
          <Text variant="bodySmall" style={{ color: colors.error }}>
            {reloadMutation.error instanceof Error
              ? reloadMutation.error.message
              : "Could not reload map data."}
          </Text>
        ) : null}
      </View>
      <Button
        mode="contained"
        icon="database-refresh"
        loading={reloadMutation.isPending}
        disabled={reloadMutation.isPending}
        onPress={() => reloadMutation.mutate()}
        testID="marker-load-resume-button"
      >
        Reload map data
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  text: {
    gap: Spacing.one,
  },
});
