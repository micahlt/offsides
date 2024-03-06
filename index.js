import * as React from 'react';
import { AppRegistry } from 'react-native';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { name as appName } from './app.json';
import App from './src/App';

export default function Main() {
  return (
    <PaperProvider theme={MD3DarkTheme}>
      <App />
    </PaperProvider>
  );
}

AppRegistry.registerComponent(appName, () => Main);
