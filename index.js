import "./src/utils/wdyr";
import * as React from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

import App from './src/App.jsx';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from "expo";

export default function Main() {
  const colorScheme = useColorScheme();
  const { theme } = useMaterial3Theme({ fallbackSourceColor: '#62d2b3' });

  const paperTheme =
    colorScheme === 'dark'
      ? { ...MD3DarkTheme, colors: theme.dark }
      : { ...MD3LightTheme, colors: theme.light };
  return (
    <PaperProvider theme={paperTheme}>
      <GestureHandlerRootView>
        <App />
      </GestureHandlerRootView>
    </PaperProvider>
  );
}

registerRootComponent(Main);
