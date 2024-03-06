import * as React from 'react';
import { AppRegistry, useColorScheme } from 'react-native';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

import { name as appName } from './app.json';
import App from './src/App';

export default function Main() {
  const colorScheme = useColorScheme();
  const { theme } = useMaterial3Theme({ sourceColor: '#62d2b3' });

  const paperTheme =
    colorScheme === 'dark'
      ? { ...MD3DarkTheme, colors: theme.dark }
      : { ...MD3LightTheme, colors: theme.light };
  return (
    <PaperProvider theme={paperTheme}>
      <App />
    </PaperProvider>
  );
}

AppRegistry.registerComponent(appName, () => Main);
