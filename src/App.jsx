import 'react-native-gesture-handler';
import React, { Context } from 'react';
import { OffsidesAppState } from './types/OffsidesTypes';
import { InteractionManager, StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import crashlytics from '@react-native-firebase/crashlytics';
import { SidechatAPIClient } from 'sidechat.js';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import MyProfileScreen from './screens/MyProfileScreen';
import CommentModal from './components/CommentModal';
import ExploreGroupsScreen from './screens/ExploreGroupsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import WriterScreen from './screens/WriterScreen';
import MessageScreen from './screens/MessagesScreen';
import ThreadScreen from './screens/ThreadScreen';
import PaginationTestScreen from './screens/PaginationTestScreen';
import EnhancedAPITestScreen from './screens/EnhancedAPITestScreen';
import { storage, hasMigratedFromAsyncStorage, migrateFromAsyncStorage } from './utils/mmkv';
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv';


const Stack = createNativeStackNavigator();

/**
 * Global app context for Offsides.  Contains API as well as current app state.
 * @type {Context<{appState: OffsidesAppState, setAppState: Function}>}
 */
const AppContext = React.createContext();

export default function App() {
  const colorScheme = useColorScheme();
  const [needsLogin, setNeedsLogin] = React.useState(null);
  const [appState, setAppState] = React.useState(null);
  const [hasMigrated, setHasMigrated] = React.useState(hasMigratedFromAsyncStorage);
  const [postSortMethod, setPostSortMethod] = useMMKVString('postSortMethod');
  React.useEffect(() => {
    crashlytics().log('Loading App');
    crashlytics().log('Fetching initial app variables');
    if (!hasMigrated) {
      InteractionManager.runAfterInteractions(async () => {
        try {
          await migrateFromAsyncStorage()
          setHasMigrated(true)
        } catch (e) {
          // TODO: fall back to AsyncStorage? Wipe storage clean and use MMKV? Crash app?
          crashlytics().recordError(e);
        }
      });
    } else {
      crashlytics().log('Initial app variables fetched successfully');
      let tempState = {
        userToken: storage.getString('userToken'),
        userID: storage.getString('userID'),
        groupID: storage.getString('groupID'),
        groupName: storage.getString('groupName'),
        groupImage: storage.getString('groupImage'),
        groupColor: storage.getString('groupColor'),
        schoolGroupID: storage.getString('schoolGroupID'),
        schoolGroupName: storage.getString('schoolGroupName'),
        schoolGroupImage: storage.getString('schoolGroupImage'),
        schoolGroupColor: storage.getString('schoolGroupColor')
      };
      // If user token is defined
      if (storage.contains('userToken')) {
        tempState.API = new SidechatAPIClient(storage.getString('userToken'));
        crashlytics().log('User successfully logged in');
        setNeedsLogin(false);
      } else {
        crashlytics().log('User is not logged in');
        tempState.API = new SidechatAPIClient();
        crashlytics().log('Redirecting to LoginScreen');
        setNeedsLogin(true);
      }
      if (!postSortMethod) {
        setPostSortMethod('hot');
      }
      crashlytics().log('App state set successfully');
      setAppState(tempState);
    }
  }, [hasMigrated]);

  return (
    <AppContext.Provider value={{ appState, setAppState }}>
      <NavigationContainer>
        <StatusBar
          barStyle={colorScheme == 'dark' ? 'light-content' : 'dark-content'}
        />
        {needsLogin != null && appState != null && (
          <Stack.Navigator
            initialRouteName={needsLogin ? 'Login' : 'Home'}
            screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              initialParams={{}}
              options={({ route: { params } }) => ({
                animation: params.animation ? params.animation : 'default',
              })}
            />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="MyProfile" component={MyProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Messages" component={MessageScreen} />
            <Stack.Screen name="Thread" component={ThreadScreen} />
            <Stack.Screen
              name="ExploreGroups"
              component={ExploreGroupsScreen}
            />
            <Stack.Screen
              name="Comments"
              component={CommentModal}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen
              name="Writer"
              component={WriterScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen name="PaginationTest" component={PaginationTestScreen} />
            <Stack.Screen name="EnhancedAPITest" component={EnhancedAPITestScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </AppContext.Provider>
  );
}

export { AppContext };
