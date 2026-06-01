import merge from 'deepmerge';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

import { AppColors } from './md3-colors';
import { getMaterialDynamicTheme, isDynamicColorSupported } from './material-dynamic-colors';

export function useThemeSetup() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const paperTheme = useMemo(() => {
    const dynamicSupported = isDynamicColorSupported();
    const themeColors = dynamicSupported ? getMaterialDynamicTheme() : AppColors;

    const lightBasedTheme = merge(MD3LightTheme, {
      colors: themeColors.light,
    });

    const darkBasedTheme = merge(MD3DarkTheme, {
      colors: themeColors.dark,
    });

    return isDarkMode ? darkBasedTheme : lightBasedTheme;
  }, [isDarkMode]);

  return {
    paperTheme,
    colorScheme,
    isDarkMode,
  };
}
