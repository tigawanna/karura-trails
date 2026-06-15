import { createDebouncedAsyncStorage } from "@/lib/storage/debounced-async-storage";
import type { CustomThemeKey } from "@/constants/Colors";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SettingsStoreType = {
  theme: "dark" | "light" | null;
  colorScheme: CustomThemeKey | null;
  dynamicColors: boolean;
  expoAdminMode: boolean;
  toggleDynamicColors: () => void;
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light" | null) => void;
  setColorScheme: (scheme: CustomThemeKey | null) => void;
  setExpoAdminMode: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsStoreType>()(
  persist(
    (set) => ({
      theme: null,
      colorScheme: null,
      dynamicColors: true,
      expoAdminMode: false,

      toggleDynamicColors: () =>
        set((state) => ({
          dynamicColors: !state.dynamicColors,
          colorScheme: !state.dynamicColors ? null : state.colorScheme,
        })),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),

      setTheme: (theme) => set({ theme }),

      setColorScheme: (scheme) =>
        set((state) => {
          const nextDynamicColors = scheme === null;
          if (state.colorScheme === scheme && state.dynamicColors === nextDynamicColors) {
            return state;
          }
          return {
            colorScheme: scheme,
            dynamicColors: nextDynamicColors,
          };
        }),

      setExpoAdminMode: (enabled) => set({ expoAdminMode: enabled }),
    }),
    {
      name: "karura-app-settings",
      storage: createJSONStorage(() => createDebouncedAsyncStorage()),
      partialize: (state) => ({
        theme: state.theme,
        colorScheme: state.colorScheme,
        dynamicColors: state.dynamicColors,
        expoAdminMode: state.expoAdminMode,
      }),
    },
  ),
);

export function useThemeStore() {
  const systemColorScheme = useColorScheme();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);

  const currentTheme = theme ?? systemColorScheme;
  const isDarkMode = currentTheme === "dark";

  return {
    theme: currentTheme,
    toggleTheme,
    setTheme,
    isDarkMode,
  };
}

export function usePersistenceLoaded() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  return isLoaded;
}
