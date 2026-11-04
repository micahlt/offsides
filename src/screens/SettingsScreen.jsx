import React from 'react';
import { Alert, View, StatusBar, ScrollView, Linking, Image } from 'react-native';
import {
  Appbar,
  Button,
  useTheme,
  Text,
  Divider,
  Avatar,
  Card,
} from 'react-native-paper';
import RNRestart from 'react-native-restart';
import { version } from '../../package.json';
import { storage } from '../utils/mmkv';
import { AppContext } from '../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import offsidesLogo from '../assets/Offsides.png';
import { needsUpdate } from '../utils';
import { useMMKVObject } from 'react-native-mmkv';
import { setStringAsync as copyToClipboard } from 'expo-clipboard';
import {
  disableNotifications,
  enableNotifications,
  getNotificationKey,
} from '../utils/notifications';

// FCM topic calls never settle while offline (they're queued and retried until
// they go through), so don't wait on them forever.
const TIMED_OUT = 'timed out';
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(TIMED_OUT), ms)),
  ]);

function SettingsScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = React.useState(false);
  const [copyingKey, setCopyingKey] = React.useState(false);
  React.useEffect(() => {
    checkForUpdate();
  }, []);
  const checkForUpdate = async () => {
    const needs = await needsUpdate(version);
    setUpdateAvailable(needs);
  };
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await withTimeout(disableNotifications(), 3000);
    } catch (e) {
      // Offline - sign out anyway rather than trapping the user here.
    }
    storage.clearAll();
    RNRestart.restart();
  };
  const copyNotificationKey = async () => {
    if (copyingKey) return;
    setCopyingKey(true);
    try {
      await copyToClipboard(getNotificationKey());
      // Make sure this phone is actually listening on the key being handed out.
      let enabled = false;
      try {
        // Long enough for the permission prompt, if Android shows one. A
        // timeout means the subscribe is queued, which counts as enabled.
        enabled = await withTimeout(enableNotifications(), 10000);
      } catch (e) {
        // Offline - it'll subscribe on the next launch.
      }
      Alert.alert(
        'Notification key copied',
        enabled
          ? 'Give this to your notifier so it knows where to send your DM notifications. Keep it private - anyone with it could receive them.'
          : "Copied, but notifications are off for Offsides, so nothing will arrive until you allow them in Android's settings.",
      );
    } finally {
      setCopyingKey(false);
    }
  };
  const unblockAll = () => {
    Alert.alert(
      'Unhide everyone?',
      "You'll start seeing posts and comments from every user you've hidden.",
      [
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              // unhidePostsFromAllUsers resolves even when the server says no,
              // so check the status here.
              const res = await appState.API.sendRequest(
                '/v1/users/unhide_all',
                'POST',
                JSON.stringify({}),
              );
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
              }
              Alert.alert('Done - everyone is unhidden.');
            } catch (e) {
              Alert.alert("Sorry, that didn't work. Please try again.");
            }
          },
        },
        {
          text: 'Cancel',
        },
      ],
    );
  };
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <ScrollView
        style={{ padding: 20 }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: insets.bottom }}>
        <Avatar.Image
          source={offsidesLogo}
          size={80}
          style={{ marginBottom: 15 }}></Avatar.Image>
        <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
          <Text variant="headlineSmall" style={{ color: colors.primary, fontWeight: "bold" }}>
            Offsides{' '}
          </Text>
          <Text variant="headlineSmall">version {version}</Text>
        </Text>
        <Text
          style={{ textAlign: 'center', marginBottom: 10, marginTop: -2 }}
          variant="labelLarge">
          a third-party client for Sidechat
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            columnGap: 10,
          }}>
          <Button
            mode="contained"
            onPress={signOut}
            loading={signingOut}
            disabled={signingOut}
            style={{
              maxWidth: '50%',
              marginTop: 10,
              marginBottom: 20,
            }}>
            Sign Out
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => Linking.openURL('https://offsides.micahlindley.com')}
            style={{
              maxWidth: '50%',
              marginTop: 10,
              marginBottom: 20,
            }}>
            Website
          </Button>
        </View>
        <Button
          mode="outlined"
          onPress={unblockAll}
          style={{ marginBottom: 20 }}>
          Unhide All Users
        </Button>
        <Button
          mode="outlined"
          icon="bell-outline"
          onPress={copyNotificationKey}
          loading={copyingKey}
          disabled={copyingKey}
          style={{ marginBottom: 20 }}>
          Copy Notification Key
        </Button>
        {updateAvailable && (
          <Card style={{ width: '90%', marginBottom: 15 }} mode="contained">
            <Card.Title
              title="Update Available"
              titleVariant="titleMedium"
              titleStyle={{ color: colors.primary, minHeight: 20 }}
              subtitle={`Version ${updateAvailable.latestVersion}`}
              subtitleStyle={{ color: colors.secondary, marginTop: 0 }}
            />
            <Card.Content>
              {updateAvailable.changelog ? (
                <Text>{updateAvailable.changelog}</Text>
              ) : (
                <Text>
                  This update brings new features and bugfixes. You should
                  update as soon as possible for the most complete and stable
                  experience!
                </Text>
              )}
            </Card.Content>
            <Card.Actions>
              <Button
                mode="elevated"
                onPress={() => {
                  Linking.openURL(
                    `https://github.com/micahlt/offsides/releases/${updateAvailable.latestVersion}/`,
                  );
                }}>
                Get Update
              </Button>
            </Card.Actions>
          </Card>
        )}
        <Card>
          <Card.Title title="Support Development"
            titleVariant="titleMedium"
            titleStyle={{ color: colors.primary, minHeight: 20 }} />
          <Card.Content>
            <Text>Offsides is a solo project by Micah Lindley.  I write and maintain this app for free on my own time.  If you want to support development of features and bugfixes, you can buy me a coffee.</Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={() => Linking.openURL("https://buymeacoffee.com/micahlt")}>Support</Button>
          </Card.Actions>
        </Card>
        <Divider />
        <Text
          style={{
            textAlign: 'center',
            marginTop: 20,
            color: colors.onSurfaceDisabled,
            userSelect: 'text',
          }}>
          User ID: {appState.userID}
        </Text>
        {!!currentGroup && <Text
          style={{
            textAlign: 'center',
            marginBottom: 10,
            color: colors.onSurfaceDisabled,
            userSelect: 'text',
          }}>
          Group ID: {currentGroup.id}
        </Text>}
        <Text
          style={{
            textAlign: 'center',
            maxWidth: '85%',
            color: colors.onSurfaceDisabled,
          }}
          variant="bodySmall">
          Offsides is an open-source project. Its source code is publicly
          available and may be modified and distributed under the terms of the
          GNU GPLv3 License. This project is not affiliated with Sidechat or its
          developers.
        </Text>
      </ScrollView>
    </View>
  );
}

export default SettingsScreen;
