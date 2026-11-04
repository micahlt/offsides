import 'react-native-gesture-handler';
import React, { Context } from 'react';
import { OffsidesAppState } from './types/OffsidesTypes.js';
import { InteractionManager, StatusBar, useColorScheme } from 'react-native';
import {
  NavigationContainer,
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import crashlytics from '@react-native-firebase/crashlytics';
import messaging from '@react-native-firebase/messaging';
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
import GroupChatsScreen from './screens/GroupChatsScreen';
import ExploreChatsScreen from './screens/ExploreChatsScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import { storage, hasMigratedFromAsyncStorage, migrateFromAsyncStorage } from './utils/mmkv';
import { useMMKVString } from 'react-native-mmkv';
import { KeyboardProvider } from "react-native-keyboard-controller";
import { enableNotifications } from './utils/notifications';
import IncomingMessageBanner from './components/IncomingMessageBanner';


const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

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
  const [navReady, setNavReady] = React.useState(false);
  // Chat to open once navigation is up, from a tapped notification.
  const [openChatID, setOpenChatID] = React.useState(null);
  // A DM push that arrived while the app was open (Android doesn't show those).
  const [incoming, setIncoming] = React.useState(null);
  React.useEffect(() => {
    crashlytics().log('Loading App');
    crashlytics().log('Fetching initial app variables');
    if (!hasMigrated) {
      InteractionManager.runAfterInteractions(async () => {
        try {
          await migrateFromAsyncStorage()
          setHasMigrated(true)
        } catch (e) {
          // A key that can't be read fails the same way on every launch, so
          // carry on with whatever did migrate rather than staying blank.
          crashlytics().recordError(e);
          storage.set('hasMigratedFromAsyncStorage', true);
          setHasMigrated(true);
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

  React.useEffect(() => {
    if (needsLogin !== false) {
      return;
    }
    enableNotifications().catch(e => crashlytics().recordError(e));
    const openFrom = m => m?.data?.chatID && setOpenChatID(m.data.chatID);
    messaging().getInitialNotification().then(openFrom);
    const unsubscribeOpened = messaging().onNotificationOpenedApp(openFrom);
    const unsubscribeMessage = messaging().onMessage(m => {
      const route = navigationRef.getCurrentRoute();
      // Already looking at that thread - it'll show up there on its own.
      if (route?.name == 'Thread' && route.params?.chatID == m.data?.chatID) {
        return;
      }
      setIncoming(m);
    });
    return () => {
      unsubscribeOpened();
      unsubscribeMessage();
    };
  }, [needsLogin]);

  React.useEffect(() => {
    if (navReady && openChatID) {
      navigationRef.dispatch(
        StackActions.push('Thread', { mode: 'existing', chatID: openChatID }),
      );
      setOpenChatID(null);
    }
  }, [navReady, openChatID]);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AppContext.Provider value={{ appState, setAppState }}>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => setNavReady(true)}>
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
                <Stack.Screen name="UserProfile" component={UserProfileScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="Messages" component={MessageScreen} />
                <Stack.Screen name="Thread" component={ThreadScreen} />
                <Stack.Screen name="GroupChats" component={GroupChatsScreen} />
                <Stack.Screen name="ExploreChats" component={ExploreChatsScreen} />
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
              </Stack.Navigator>
            )}
            <IncomingMessageBanner
              message={incoming}
              onOpen={() => setOpenChatID(incoming?.data?.chatID)}
            />
          </NavigationContainer>
        </AppContext.Provider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

export { AppContext };
