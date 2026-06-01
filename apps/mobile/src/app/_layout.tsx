import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useThemeSetup } from '@/theme';

export default function TabLayout() {
  const { colorScheme, paperTheme, isDarkMode } = useThemeSetup();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={paperTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </PaperProvider>
    </ThemeProvider>
  );
}
