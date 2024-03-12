import React from 'react';
import { View, StatusBar, ScrollView, Linking, Image } from 'react-native';
import {
  Appbar,
  Button,
  useTheme,
  Text,
  Divider,
  Avatar,
} from 'react-native-paper';
import RNRestart from 'react-native-restart';
import { version } from '../../package.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppContext } from '../App';
import offsidesLogo from '../assets/Offsides.png';
import { needsUpdate } from '../utils';

function SettingsScreen({ navigation }) {
  const appState = React.useContext(AppContext);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const { colors } = useTheme();
  React.useEffect(() => {
    checkForUpdate();
  }, []);
  const checkForUpdate = async () => {
    const needs = await needsUpdate(version);
    setUpdateAvailable(needs);
  };
  const signOut = () => {
    AsyncStorage.clear().then(() => RNRestart.restart());
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
        contentContainerStyle={{ alignItems: 'center' }}>
        <Avatar.Image
          source={offsidesLogo}
          size={80}
          style={{ marginBottom: 15 }}></Avatar.Image>
        <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
          <Text variant="headlineSmall" style={{ color: colors.primary }}>
            Offsides{' '}
          </Text>
          <Text variant="headlineSmall">version {version}</Text>
        </Text>
        <Text
          style={{ textAlign: 'center', marginBottom: 10, marginTop: -2 }}
          variant="labelLarge">
          a third-party client for Sidechat
        </Text>
        {updateAvailable ? (
          <Text style={{ textAlign: 'center' }}>
            update to version {updateAvailable} available
          </Text>
        ) : (
          <Text style={{ textAlign: 'center' }}>running latest version</Text>
        )}
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
          {updateAvailable && (
            <Button
              mode="contained-tonal"
              onPress={() => {
                Linking.openURL(
                  `https://github.com/micahlt/offsides/releases/download/${updateAvailable}/offsides-${updateAvailable.replaceAll(
                    '.',
                    '-',
                  )}.apk`,
                );
              }}
              style={{
                maxWidth: '50%',
                marginTop: 10,
                marginBottom: 20,
              }}>
              Get Update
            </Button>
          )}
        </View>
        <Divider />
        <Text style={{ textAlign: 'center', marginTop: 20 }}>
          User ID: {appState.userID}
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 30 }}>
          Group ID: {appState.groupID}
        </Text>
      </ScrollView>
    </View>
  );
}

export default SettingsScreen;
