import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Icon, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/theme";

export type ErrorStateProps = {
  title: string;
  message: string;
  hint?: string;
  details?: string;
  onRetry?: () => void;
  testID?: string;
};

export function ErrorState({ title, message, hint, details, onRetry, testID }: ErrorStateProps) {
  const { colors } = useTheme();
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
          paddingLeft: insets.left + Spacing.four,
          paddingRight: insets.right + Spacing.four,
        },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[styles.iconWrap, { backgroundColor: colors.errorContainer }]}
          accessibilityRole="image"
          accessibilityLabel="Error"
        >
          <Icon source="alert-circle-outline" size={40} color={colors.onErrorContainer} />
        </View>

        <Text variant="headlineSmall" style={[styles.title, { color: colors.onBackground }]}>
          {title}
        </Text>

        <Text variant="bodyLarge" style={[styles.message, { color: colors.onSurfaceVariant }]}>
          {message}
        </Text>

        {hint ? (
          <Card mode="elevated" style={styles.hintCard}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: colors.primary }}>
                What you can do
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: colors.onSurface, marginTop: Spacing.one }}
              >
                {hint}
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {details ? (
          <Card mode="outlined" style={styles.detailsCard}>
            <Card.Content style={styles.detailsContent}>
              <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
                Technical details
              </Text>
              <ScrollView
                style={styles.detailsScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <Text
                  variant="bodySmall"
                  selectable
                  style={[styles.detailsText, { color: colors.onSurface }]}
                >
                  {details}
                </Text>
              </ScrollView>
            </Card.Content>
          </Card>
        ) : null}

        {onRetry ? (
          <Button
            mode="contained"
            icon="refresh"
            onPress={onRetry}
            style={styles.retryButton}
            testID={testID ? `${testID}-retry` : undefined}
          >
            Try again
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    gap: Spacing.three,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    fontWeight: "600",
  },
  message: {
    textAlign: "center",
    lineHeight: 24,
  },
  hintCard: {
    width: "100%",
  },
  detailsCard: {
    width: "100%",
    maxHeight: 160,
  },
  detailsContent: {
    gap: Spacing.one,
  },
  detailsScroll: {
    maxHeight: 120,
  },
  detailsText: {
    fontFamily: "monospace",
    lineHeight: 18,
  },
  retryButton: {
    width: "100%",
    marginTop: Spacing.two,
  },
});
