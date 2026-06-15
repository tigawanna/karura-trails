import type { ReactNode } from "react";
import { SymbolView } from "expo-symbols";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MaxContentWidth, Spacing, useTheme as useAppTheme } from "@/theme";

export type ErrorStateProps = {
  title: string;
  message: string;
  testID?: string;
  action?: ReactNode;
};

const errorIcon = {
  ios: "exclamationmark.triangle.fill",
  android: "warning",
  web: "warning",
} as const;

export function ErrorState({ title, message, testID, action }: ErrorStateProps) {
  const { colors } = useTheme();
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + Spacing.four,
          paddingHorizontal: Spacing.four,
        },
      ]}
    >
      <View
        style={[
          styles.panel,
          {
            backgroundColor: appTheme.card,
            borderColor: appTheme.cardBorder,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.errorContainer }]}>
          <SymbolView name={errorIcon} size={28} tintColor={colors.error} />
        </View>

        <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface }]}>
          {title}
        </Text>

        <ScrollView
          style={styles.messageScroll}
          contentContainerStyle={styles.messageContent}
          nestedScrollEnabled
        >
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, textAlign: "center" }}>
            {message}
          </Text>
        </ScrollView>
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    fontWeight: "600",
  },
  messageScroll: {
    maxHeight: 160,
    width: "100%",
  },
  messageContent: {
    alignItems: "center",
  },
});
