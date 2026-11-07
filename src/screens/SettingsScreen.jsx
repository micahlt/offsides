import React from 'react';
import { View, StatusBar, ScrollView, Linking, Image } from 'react-native';
import {
  Appbar,
  Button,
  useTheme,
  Text,
  Divider,
  Avatar,
  Card,
  Dialog,
  Portal,
  TextInput,
  ActivityIndicator,
} from 'react-native-paper';
import RNRestart from 'react-native-restart';
import { version } from '../../package.json';
import { storage } from '../utils/mmkv';
import { AppContext } from '../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import offsidesLogo from '../assets/Offsides.png';
import { needsUpdate } from '../utils';
import { deleteAccount } from '../utils/deleteAccount';
import { useMMKVObject } from 'react-native-mmkv';

function SettingsScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);

  // Yik Yak has no in-app or API account deletion, so open a prefilled
  // deletion request to their support address.
  const requestAccountDeletion = async () => {
    let username = '';
    try {
      const u = await appState.API.getUpdates();
      username = u?.user?.username || '';
    } catch (e) {
      // leave blank
    }
    const subject = 'Account deletion request';
    const body = [
      'Hello,',
      '',
      'Please permanently delete my Yik Yak account and all data associated with it.',
      '',
      `Username: ${username || '(add your username)'}`,
      `User ID: ${appState.userID || '(unknown)'}`,
      'Phone number on the account: (add your phone number)',
      '',
      'Please confirm by email once the account has been deleted.',
      '',
      'Thank you.',
    ].join('\n');
    Linking.openURL(
      `mailto:support@yikyak.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  React.useEffect(() => {
    checkForUpdate();
  }, []);
  const checkForUpdate = async () => {
    const needs = await needsUpdate(version);
    setUpdateAvailable(needs);
  };
  const signOut = () => {
    storage.clearAll();
    RNRestart.restart();
  };

  // Account deletion
  const [deleteDialog, setDeleteDialog] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [deleteResult, setDeleteResult] = React.useState(null);

  const runDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteAccount(appState.API, appState.userID);
      setDeleteResult(result);
    } catch (err) {
      setDeleteResult({ deleted: false, log: [err.message] });
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    if (deleteResult?.deleted) {
      signOut();
      return;
    }
    setDeleteDialog(false);
    setDeleteConfirmText('');
    setDeleteResult(null);
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
        <Card style={{ width: '90%', marginBottom: 20 }} mode="outlined">
          <Card.Title title="Delete your Yik Yak account" />
          <Card.Content>
            <Text variant="bodyMedium">
              Delete account tries to delete it directly. Yik Yak hasn't
              documented how, so it tries a few likely requests and checks
              whether each one worked. Email support sends Yik Yak a
              deletion request instead.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button icon="email-outline" onPress={requestAccountDeletion}>
              Email support
            </Button>
            <Button
              mode="contained"
              buttonColor={colors.error}
              textColor={colors.onError}
              icon="delete-forever"
              onPress={() => setDeleteDialog(true)}>
              Delete account
            </Button>
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
          MIT License. This project is not affiliated with Sidechat or its
          developers.
        </Text>
      </ScrollView>
      <Portal>
        <Dialog visible={deleteDialog} onDismiss={closeDeleteDialog}>
          <Dialog.Title>
            {deleteResult
              ? deleteResult.deleted
                ? 'Account deleted'
                : "Couldn't delete account"
              : 'Delete your Yik Yak account?'}
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 360, paddingHorizontal: 24 }}>
            <ScrollView>
              {deleting ? (
                <View style={{ alignItems: 'center', padding: 20, gap: 10 }}>
                  <ActivityIndicator />
                  <Text>Trying… don't close the app.</Text>
                </View>
              ) : deleteResult ? (
                <View style={{ gap: 10, paddingVertical: 10 }}>
                  <Text variant="bodyMedium">
                    {deleteResult.deleted
                      ? `Your account was deleted (${deleteResult.via}). Tap Done to log out.`
                      : 'None of the requests deleted your account, and it is still active. Screenshot this and send it to Claude:'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {deleteResult.log.join('\n')}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, paddingVertical: 10 }}>
                  <Text variant="bodyMedium">
                    This is permanent and can't be undone. If it works, your
                    account, posts and messages will be gone.
                  </Text>
                  <Text variant="bodyMedium">Type DELETE to confirm.</Text>
                  <TextInput
                    mode="outlined"
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    autoCapitalize="characters"
                  />
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            {deleteResult ? (
              <Button onPress={closeDeleteDialog}>
                {deleteResult.deleted ? 'Done' : 'Close'}
              </Button>
            ) : (
              <>
                <Button disabled={deleting} onPress={closeDeleteDialog}>
                  Cancel
                </Button>
                <Button
                  textColor={colors.error}
                  disabled={deleting || deleteConfirmText.trim() !== 'DELETE'}
                  onPress={runDelete}>
                  Delete forever
                </Button>
              </>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

export default SettingsScreen;
