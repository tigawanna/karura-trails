import { useRegisterCrashalytics } from "@/lib/react-native-firebase/crashalytics/use-register-crashalytics";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider, useTheme } from "react-native-paper";

import { AnimatedSplashOverlay } from "@/components/splash/animated-icon";
import { MarkerActionMenuHost } from "@/components/map/marker-action-menu-host";
import { useLocationWatcher } from "@/hooks/use-location-watcher";
import { InitDatabase } from "@/lib/drizzle/InitDatabase";
import { queryClient } from "@/lib/tanstack/query/client";
import {
  onAppStateChange,
  useAppState,
  useOnlineManager,
} from "@/lib/tanstack/query/react-native-setup-hooks";
import { useThemeSetup } from "@/theme";

function LocationWatcherHost() {
  useLocationWatcher();
  return null;
}

function DrawerNavigator() {
  const { colors } = useTheme();

  return (
    <Drawer
      screenOptions={{
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.onSurfaceVariant,
        drawerStyle: { backgroundColor: colors.surface },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { color: colors.onSurface },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: "Map",
          title: "Karura Trails",
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="navigate"
        options={{
          drawerLabel: "Navigate",
          title: "Navigate",
        }}
      />
      <Drawer.Screen
        name="trails"
        options={{
          drawerLabel: "Markers",
          title: "Markers",
        }}
      />
      <Drawer.Screen
        name="route"
        options={{
          drawerItemStyle: { display: "none", height: 0 },
          title: "Route",
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: "Settings",
          title: "Settings",
        }}
      />
    </Drawer>
  );
}

export default function RootLayout() {
  useOnlineManager();
  useAppState(onAppStateChange);
  useRegisterCrashalytics();
  const { colorScheme, paperTheme, isDarkMode } = useThemeSetup();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <PaperProvider theme={paperTheme}>
          <QueryClientProvider client={queryClient}>
            <LocationWatcherHost />
            <InitDatabase>
              <AnimatedSplashOverlay />
              <DrawerNavigator />
              <MarkerActionMenuHost />
              <StatusBar style={isDarkMode ? "light" : "dark"} />
            </InitDatabase>
          </QueryClientProvider>
        </PaperProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
