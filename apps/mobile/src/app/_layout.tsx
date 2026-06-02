import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { InitDatabase } from "@/db/InitDatabase";
import { useThemeSetup } from "@/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function TabLayout() {
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
