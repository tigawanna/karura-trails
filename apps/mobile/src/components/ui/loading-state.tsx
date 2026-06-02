import { Host, LinearWavyProgressIndicator } from "@expo/ui/jetpack-compose";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/theme";

const isAndroid = process.env.EXPO_OS === "android";

export type LoadingStateProps = {
  message: string;
  testID?: string;
};

export function LoadingState({ message, testID }: LoadingStateProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {isAndroid ? (
        <Host style={styles.wavyHost} matchContents>
          <LinearWavyProgressIndicator color={colors.primary} />
        </Host>
      ) : (
        <ActivityIndicator size="large" color={colors.primary} />
      )}
      <Text
        variant="bodyLarge"
        style={{ color: colors.onSurfaceVariant, marginTop: Spacing.three }}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  wavyHost: {
    width: 200,
  },
});
