import 'react-native-gesture-handler';
import React, { Context } from 'react';
import { OffsidesAppState } from './types/OffsidesTypes';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SidechatAPIClient } from 'sidechat.js';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import MyProfileScreen from './screens/MyProfileScreen';
import CommentModal from './components/CommentModal';
import ExploreGroupsScreen from './screens/ExploreGroupsScreen';
import EditIconScreen from './screens/EditIconScreen';

const Stack = createNativeStackNavigator();

/**
 * Global app context for Offsides.  Contains API as well as current app state.
 * @type {Context<{appState: OffsidesAppState, setAppState: Function}>}
 */
const AppContext = React.createContext();

export default function App() {
  const colorScheme = useColorScheme();
  const [needsLogin, setNeedsLogin] = React.useState(null);
  const [appState, setAppState] = React.useState({});

  React.useEffect(() => {
    AsyncStorage.multiGet([
      'userToken',
      'userID',
      'groupID',
      'groupName',
      'groupImage',
    ]).then(res => {
      let tempState = {};
      // If user token is defined
      if (res[0][1]) {
        tempState.API = new SidechatAPIClient(res[0][1]);
        setNeedsLogin(false);
      } else {
        tempState.API = new SidechatAPIClient();
        setNeedsLogin(true);
      }
      res.forEach(item => {
        tempState[item[0]] = item[1];
      });
      setAppState(tempState);
    });
  }, []);
  return (
    <AppContext.Provider value={{ appState, setAppState }}>
      <NavigationContainer>
        <StatusBar
          barStyle={colorScheme == 'dark' ? 'light-content' : 'dark-content'}
        />
        {needsLogin != null && (
          <Stack.Navigator
            initialRouteName={needsLogin ? 'Login' : 'Home'}
            screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="MyProfile" component={MyProfileScreen} />
            <Stack.Screen
              name="ExploreGroups"
              component={ExploreGroupsScreen}
            />
            <Stack.Screen name="EditIcon" component={EditIconScreen} />
            <Stack.Screen
              name="Comments"
              component={CommentModal}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade_from_bottom',
              }}
            />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </AppContext.Provider>
  );
}

export { AppContext };
