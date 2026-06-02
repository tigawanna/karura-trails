import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { InitDatabase } from "@/lib/drizzle/InitDatabase";
import { useThemeSetup } from "@/theme";
import { queryClient } from "@/lib/tanstack/query/client";
import { onAppStateChange, useAppState, useOnlineManager } from "@/lib/tanstack/query/react-native-setup-hooks";



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
