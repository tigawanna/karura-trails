import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LegendList } from "@legendapp/list/react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Share, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import {
  buildPendingSyncExportPayload,
  pendingSyncEventsQueryOptions,
  pushSyncEvents,
  removeOutboundSyncEvent,
  updateOutboundSyncEventPayload,
} from "@/data-access-layer/sync-queue";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import type { SyncEventRecord } from "@/lib/sync/sync.types";
import { getSyncApiBaseUrl } from "@/services/sync/sync.api";
import { LoadingState } from "@/components/ui/loading-state";
import { legendListVirtualizationProps } from "@/lib/legend-list/virtualization-props";
import { MaxContentWidth, Spacing } from "@/theme";

const SYNC_QUEUE_ROW_ESTIMATED_SIZE = 88;
const syncQueueListVirtualization = legendListVirtualizationProps(SYNC_QUEUE_ROW_ESTIMATED_SIZE);

function eventTitle(event: SyncEventRecord): string {
  const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (name) {
    return name;
  }
  return `${event.action} · ${event.tableName} #${event.rowId}`;
}

function eventSubtitle(event: SyncEventRecord): string {
  const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
  const category = typeof payload.category === "string" ? payload.category : "custom";
  return `${event.action} · ${category} · ${new Date(event.createdAt).toLocaleString()}`;
}

interface SyncQueueEventItemProps {
  event: SyncEventRecord;
  syncApiConfigured: boolean;
  pushPending: boolean;
  onEdit: (event: SyncEventRecord) => void;
  onPush: (eventId: string) => void;
  onRemove: (event: SyncEventRecord) => void;
}

function SyncQueueEventItem({
  event,
  syncApiConfigured,
  pushPending,
  onEdit,
  onPush,
  onRemove,
}: SyncQueueEventItemProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card} testID={`sync-queue-item-${event.id}`}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardText}>
            <Text variant="titleMedium" style={{ color: colors.onSurface }}>
              {eventTitle(event)}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {eventSubtitle(event)}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <IconButton
              icon="pencil-outline"
              size={20}
              onPress={() => onEdit(event)}
              testID={`sync-queue-edit-${event.id}`}
            />
            <IconButton
              icon="upload"
              size={20}
              disabled={!syncApiConfigured || pushPending}
              onPress={() => onPush(event.id)}
              testID={`sync-queue-push-${event.id}`}
            />
            <IconButton
              icon="delete-outline"
              size={20}
              onPress={() => onRemove(event)}
              testID={`sync-queue-remove-${event.id}`}
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

export function SyncQueueScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const syncApiConfigured = getSyncApiBaseUrl() != null;
  const { data: events = [], isPending } = useQuery(pendingSyncEventsQueryOptions);
  const [selectedEvent, setSelectedEvent] = useState<SyncEventRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.pendingSyncEvents] });
    await queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.capturedPoints] });
  }, [queryClient]);

  const pushMutation = useMutation({
    mutationFn: (eventIds?: string[]) => pushSyncEvents(eventIds),
    onSuccess: async (result) => {
      await invalidate();
      Alert.alert(
        result.pushed > 0 ? "Sync pushed" : "Nothing to push",
        result.pushed > 0
          ? `${result.pushed} event(s) sent to the sync server.`
          : "No pending events were available to push.",
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        "Push failed",
        error instanceof Error ? error.message : "Could not push sync events.",
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeOutboundSyncEvent,
    onSuccess: invalidate,
    onError: (error: unknown) => {
      Alert.alert(
        "Remove failed",
        error instanceof Error ? error.message : "Could not remove sync event.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) {
        throw new Error("No event selected.");
      }
      await updateOutboundSyncEventPayload(selectedEvent.id, {
        name: editName.trim() || null,
        description: editDescription.trim() || null,
      });
    },
    onSuccess: async () => {
      setSelectedEvent(null);
      setEditError(null);
      await invalidate();
    },
    onError: (error: unknown) => {
      setEditError(error instanceof Error ? error.message : "Could not update sync event.");
    },
  });

  const handleExport = useCallback(async () => {
    try {
      const eventsForExport = await buildPendingSyncExportPayload();
      const json = JSON.stringify(eventsForExport, null, 2);
      await Share.share({
        message: json,
        title: "Karura Trails pending sync export",
      });
    } catch (error) {
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "Could not export sync events.",
      );
    }
  }, []);

  const openEditor = (event: SyncEventRecord) => {
    const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
    setSelectedEvent(event);
    setEditName(typeof payload.name === "string" ? payload.name : "");
    setEditDescription(typeof payload.description === "string" ? payload.description : "");
    setEditError(null);
  };

  const confirmRemove = (event: SyncEventRecord) => {
    Alert.alert(
      "Remove from sync queue?",
      "This removes the pending sync event. The local marker stays on your device unless you delete it separately on the map.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMutation.mutate(event.id),
        },
      ],
    );
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          Changes you save on this device are queued here until they are pushed to the sync server.
        </Text>

        {!syncApiConfigured ? (
          <Card style={styles.noticeCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                EXPO_PUBLIC_SYNC_API_URL is not configured. You can still export queued events as
                JSON and upload them manually through the web dashboard.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            icon="upload"
            loading={pushMutation.isPending}
            disabled={events.length === 0 || !syncApiConfigured}
            onPress={() => pushMutation.mutate(undefined)}
            testID="sync-queue-push-all"
          >
            Push all
          </Button>
          <Button
            mode="outlined"
            icon="export"
            disabled={events.length === 0}
            onPress={handleExport}
            testID="sync-queue-export"
          >
            Export JSON
          </Button>
        </View>
      </View>
    ),
    [
      colors.onSurfaceVariant,
      events.length,
      handleExport,
      pushMutation,
      syncApiConfigured,
    ],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.empty}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>
          Queue is empty
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: "center" }}>
          Save a marker in the field and it will appear here, ready to sync.
        </Text>
      </View>
    ),
    [colors.onSurface, colors.onSurfaceVariant],
  );

  if (isPending) {
    return <LoadingState testID="sync-queue-loading" embedded />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="sync-queue-screen">
      <LegendList
        data={events}
        keyExtractor={(event) => event.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        estimatedHeaderSize={220}
        renderItem={({ item }) => (
          <SyncQueueEventItem
            event={item}
            syncApiConfigured={syncApiConfigured}
            pushPending={pushMutation.isPending}
            onEdit={openEditor}
            onPush={(eventId) => pushMutation.mutate([eventId])}
            onRemove={confirmRemove}
          />
        )}
        recycleItems
        testID="sync-queue-list"
        {...syncQueueListVirtualization}
      />

      <Portal>
        <Modal
          visible={selectedEvent != null}
          onDismiss={() => setSelectedEvent(null)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: colors.onSurface }}>
            Edit queued update
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            You can adjust text fields here. Map position changes still need to be made on the map.
          </Text>
          <TextInput
            label="Name"
            value={editName}
            onChangeText={setEditName}
            mode="outlined"
            testID="sync-queue-edit-name"
          />
          <TextInput
            label="Description"
            value={editDescription}
            onChangeText={setEditDescription}
            mode="outlined"
            multiline
            testID="sync-queue-edit-description"
          />
          {editError ? (
            <Text variant="bodySmall" style={{ color: colors.error }}>
              {editError}
            </Text>
          ) : null}
          <Divider />
          <View style={styles.modalActions}>
            <Button onPress={() => setSelectedEvent(null)} testID="sync-queue-edit-cancel">
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={updateMutation.isPending}
              onPress={() => updateMutation.mutate()}
              testID="sync-queue-edit-save"
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  listHeader: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  noticeCard: {
    backgroundColor: "transparent",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  empty: {
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  card: {
    backgroundColor: "transparent",
  },
  cardContent: {
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -8,
    marginRight: -8,
  },
  modal: {
    marginHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.two,
  },
});
