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
} from 'react-native-paper';
import RNRestart from 'react-native-restart';
import { version } from '../../package.json';
import { storage } from '../utils/mmkv';
import { AppContext } from '../App';
import offsidesLogo from '../assets/Offsides.png';
import { needsUpdate } from '../utils';
import { useMMKVObject } from 'react-native-mmkv';

function SettingsScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');
  const { colors } = useTheme();
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
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <Button
            mode="outlined"
            onPress={() => navigation.push('PaginationTest')}
            style={{ flex: 1 }}>
            Test API
          </Button>
          <Button
            mode="contained"
            onPress={() => navigation.push('EnhancedAPITest')}
            style={{ flex: 1 }}>
            Test Enhanced API
          </Button>
        </View>
        {updateAvailable && (
          <Card style={{ width: '90%' }} mode="contained">
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
          MIT License. This project is not affiliated with Sidechat or its
          developers.
        </Text>
      </ScrollView>
    </View>
  );
}

export default SettingsScreen;
