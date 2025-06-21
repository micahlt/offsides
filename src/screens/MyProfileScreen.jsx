import React from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import {
  Appbar,
  useTheme,
  Text,
  Card,
  Avatar,
  ProgressBar,
  TouchableRipple,
  Divider,
  Button,
  Badge,
} from 'react-native-paper';
import { AppContext } from '../App';
import timesago from 'timesago';
import { useFocusEffect } from '@react-navigation/native';
import crashlytics from '@react-native-firebase/crashlytics';
import UserContent from '../components/UserContent';
import EnhancedUserContent from '../components/EnhancedUserContent';
import { useMMKVObject } from 'react-native-mmkv';

const BORDER_RADIUS = 15;

function MyProfileScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [updates, setUpdates] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [updateBadge, setUpdateBadge] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');
  const { colors } = useTheme();
  useFocusEffect(() => {
    crashlytics().log('Loading MyProfileScreen');
    loadProfile();
    needsUpdate().then(setUpdateBadge);
  });
  const loadProfile = async () => {
    crashlytics().log('Fetching profile');
    const u = await API.getUpdates(currentGroup?.id);
    crashlytics().log('Profile fetched successfully');
    setUpdates(u);
    setLoading(false);
  };
  const s = StyleSheet.create({
    stat: { fontWeight: 900, color: colors.primary },
  });
  return (
    <View
      style={{
        backgroundColor: colors.background,
        flex: 1,
      }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={
            updates?.user?.username
              ? `@${updates.user.username}`
              : 'Your Profile'
          }
        />
        <Appbar.Action
          onPress={() => navigation.push('Messages')}
          icon="chat"
        />
        <View>
          <Badge
            style={{
              position: 'absolute',
              bottom: 10,
              zIndex: 1,
              alignSelf: 'center',
            }}
            size={12}
            visible={updateBadge}>
            UPDATE
          </Badge>
          <Appbar.Action
            onPress={() => navigation.push('Settings')}
            icon="cog"
          />
        </View>
      </Appbar.Header>
      {loading && <ProgressBar indeterminate={true} visible={true} />}
      {updates?.user && (
        <View
          style={{
            rowGap: 10,
            padding: 10,
            flex: 1,
            justifyContent: 'flex-start',
            flexDirection: 'column',
          }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableRipple
              borderless={true}
              style={{ borderRadius: BORDER_RADIUS }}
              onPress={() => navigation.push('EditProfile')}>
              {updates.user?.conversation_icon ? (
                <Avatar.Text
                  size={64}
                  label={String(updates.user?.conversation_icon?.emoji || '‼️')}
                  color="white"
                  style={{
                    backgroundColor:
                      updates.user?.conversation_icon?.color || colors.primary,
                    borderRadius: BORDER_RADIUS,
                  }}
                />
              ) : (
                <Avatar.Icon
                  size={64}
                  icon="account"
                  style={{ borderRadius: BORDER_RADIUS }}
                />
              )}
            </TouchableRipple>
            <Button
              icon="pencil"
              size={16}
              mode="contained-tonal"
              onPress={() => navigation.push('EditProfile')}>
              Edit
            </Button>
            <Text
              variant="titleMedium"
              style={{ textAlign: 'right', flexGrow: 1, marginRight: 10 }}>
              joined {timesago(updates.user.created_at)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flex: 1 }}>
              <Card.Content style={{ paddingVertical: 12 }}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}>
                  Post Karma
                </Text>
                <Text variant="titleLarge" style={s.stat}>
                  {updates?.karma?.post || '--'}
                </Text>
              </Card.Content>
            </Card>
            <Card style={{ flex: 1 }}>
              <Card.Content style={{ paddingVertical: 12 }}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}>
                  Comment Karma
                </Text>
                <Text variant="titleLarge" style={s.stat}>
                  {updates?.karma?.comment || '--'}
                </Text>
              </Card.Content>
            </Card>
          </View>
          <Card onPress={() => navigation.push('UserStats')}>
            <Card.Content style={{ paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
              <Text variant="bodySmall">
                Stats Page
              </Text>
            </Card.Content>
          </Card>
          <EnhancedUserContent updates={updates} />
        </View>
      )}
    </View>
  );
}

export default MyProfileScreen;
