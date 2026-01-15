import "./global.css"
import * as React from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

import App from './src/App.jsx';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from "expo";
import { ThemeProvider } from '@react-navigation/native';
import { NAV_THEME } from '@/lib/theme';

export default function Main() {
  const colorScheme = useColorScheme();
  const { theme } = useMaterial3Theme({ fallbackSourceColor: '#62d2b3' });

  const paperTheme =
    colorScheme === 'dark'
      ? { ...MD3DarkTheme, colors: theme.dark }
      : { ...MD3LightTheme, colors: theme.light };
  return (
    <ThemeProvider value={NAV_THEME[colorScheme]}>
      <PaperProvider theme={paperTheme}>
        <GestureHandlerRootView>
          <App />
        </GestureHandlerRootView>
      </PaperProvider>
    </ThemeProvider>
  );
}

registerRootComponent(Main);
