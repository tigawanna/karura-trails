import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";

import { AnimatedSplashOverlay } from "@/components/splash/animated-icon";
import AppTabs from "@/components/navigation/app-tabs";
import { InitDatabase } from "@/lib/drizzle/InitDatabase";
import { queryClient } from "@/lib/tanstack/query/client";
import {
  onAppStateChange,
  useAppState,
  useOnlineManager,
} from "@/lib/tanstack/query/react-native-setup-hooks";
import { useThemeSetup } from "@/theme";

export default function TabLayout() {
  useOnlineManager();
  useAppState(onAppStateChange);
  const { colorScheme, paperTheme, isDarkMode } = useThemeSetup();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={paperTheme}>
        <QueryClientProvider client={queryClient}>
          <InitDatabase>
            <AnimatedSplashOverlay />
            <AppTabs />
            <StatusBar style={isDarkMode ? "light" : "dark"} />
          </InitDatabase>
        </QueryClientProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}
