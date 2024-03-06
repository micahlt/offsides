import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();

const AppContext = React.createContext();

export default function App() {
  const [needsLogin, setNeedsLogin] = React.useState(null);
  const [appState, setAppState] = React.useState({});
  React.useEffect(() => {
    AsyncStorage.getItem('userToken').then(res => {
      if (res) {
        setNeedsLogin(false);
      } else setNeedsLogin(true);
    });
    AsyncStorage.multiGet(['userToken', 'userID', 'groupID', 'groupName']).then(
      res => {
        let tempState = appState;
        res.forEach(item => {
          tempState[item[0]] = item[1];
        });
        setAppState(tempState);
      },
    );
  }, []);
  return (
    <AppContext.Provider value={appState}>
      <NavigationContainer>
        {needsLogin != null && (
          <Stack.Navigator
            initialRouteName={needsLogin ? 'Login' : 'Home'}
            screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </AppContext.Provider>
  );
}

export { AppContext };
