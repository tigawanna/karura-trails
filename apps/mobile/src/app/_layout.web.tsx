import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, useTheme } from "react-native-paper";

import { AnimatedSplashOverlay } from "@/components/splash/animated-icon";
import { MarkerActionMenuHost } from "@/components/map/marker-action-menu-host";
import { InitDatabase } from "@/lib/drizzle/InitDatabase";
import { queryClient } from "@/lib/tanstack/query/client";
import {
  onAppStateChange,
  useAppState,
  useOnlineManager,
} from "@/lib/tanstack/query/react-native-setup-hooks";
import { useThemeSetup } from "@/theme";

function WebStack() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { color: colors.onSurface },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: "Map" }} />
      <Stack.Screen name="trails" options={{ title: "Markers" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useOnlineManager();
  useAppState(onAppStateChange);
  const { colorScheme, paperTheme, isDarkMode } = useThemeSetup();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={paperTheme}>
        <QueryClientProvider client={queryClient}>
          <InitDatabase>
            <AnimatedSplashOverlay />
            <WebStack />
            <MarkerActionMenuHost />
            <StatusBar style={isDarkMode ? "light" : "dark"} />
          </InitDatabase>
        </QueryClientProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}
