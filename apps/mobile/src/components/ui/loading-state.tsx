import { Host, LinearWavyProgressIndicator } from "@expo/ui/jetpack-compose";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/theme";

const isAndroid = process.env.EXPO_OS === "android";

export type LoadingIndicatorSize = "small" | "large";

export type LoadingIndicatorProps = {
  size?: LoadingIndicatorSize;
};

export function LoadingIndicator({ size = "large" }: LoadingIndicatorProps) {
  const { colors } = useTheme();

  if (isAndroid) {
    return (
      <Host
        style={[
          size === "small" ? styles.wavyHostSmall : styles.wavyHostLarge,
          styles.wavyHost,
        ]}
        matchContents
      >
        <LinearWavyProgressIndicator color={colors.primary} />
      </Host>
    );
  }

  return <ActivityIndicator size={size} color={colors.primary} />;
}

export type LoadingStateProps = {
  message?: string;
  testID?: string;
  embedded?: boolean;
};

export function LoadingState({ message, testID, embedded = false }: LoadingStateProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: embedded ? 0 : insets.top,
          paddingBottom: embedded ? 0 : insets.bottom,
        },
      ]}
    >
      <LoadingIndicator size="large" />
      {message ? (
        <Text
          variant="bodyLarge"
          style={{ color: colors.onSurfaceVariant, marginTop: Spacing.three }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

export type LoadingOverlayProps = {
  message?: string;
  testID?: string;
};

export function LoadingOverlay({ message, testID }: LoadingOverlayProps) {
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.backdrop }]}
    >
      <LoadingIndicator size="large" />
      {message ? (
        <Text variant="bodyMedium" style={{ color: colors.onSurface, marginTop: Spacing.two }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  wavyHostLarge: {
    width: 200,
  },
  wavyHostSmall: {
    width: 120,
  },
  wavyHost: {
    alignSelf: "center",
  },
});
