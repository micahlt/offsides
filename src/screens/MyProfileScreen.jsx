import React, { useEffect } from 'react';
import { View, StatusBar, StyleSheet, ScrollView } from 'react-native';
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
import { useMMKVObject } from 'react-native-mmkv';
import { needsUpdate } from '../utils';

const BORDER_RADIUS = 15;

function MyProfileScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [updates, setUpdates] = React.useState(false);
  const [karmaInfo, setKarmaInfo] = React.useState([])
  const [loading, setLoading] = React.useState(true);
  const [updateBadge, setUpdateBadge] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');
  const { colors } = useTheme();

  useFocusEffect(React.useCallback(() => {
    crashlytics().log('Loading MyProfileScreen');
    loadProfile();
    needsUpdate().then(setUpdateBadge);
  }, []));

  const getKarmaInfo = (karmaObj, groupList) => {
    let karmaObjects = [];
    karmaObjects.push({
      header: "Post Karma",
      value: karmaObj?.post || 0
    });
    karmaObjects.push({
      header: "Comment Karma",
      value: karmaObj?.comment || 0
    });
    karmaObj?.groups.forEach(group => {
      const g = groupList.find((item => item.id == group.group_id));
      karmaObjects.push({
        header: g.name,
        value: group.post + group.comment
      })
    });
    return karmaObjects;
  };

  useEffect(() => {
    const info = getKarmaInfo(updates?.karma, updates?.groups);
    setKarmaInfo(info);
  }, [updates])

  const loadProfile = async () => {
    crashlytics().log('Fetching profile');
    const u = await API.getUpdates(currentGroup?.id);
    crashlytics().log('Profile fetched successfully');
    setUpdates(u);
    setLoading(false);
  };

  const s = StyleSheet.create({
    stat: { fontWeight: 900, color: colors.primary, marginTop: -5 },
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
        <View style={{ flexDirection: "column", flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10 }}>
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
            <View style={{ flexGrow: 1, marginRight: 10 }}>
              <Text
                variant="titleSmall"
                style={{ textAlign: 'right' }}>
                joined {timesago(updates.user.created_at)}
              </Text>
              <Text
                variant="titleSmall"
                style={{ textAlign: 'right' }}>
                {updates?.user?.follower_count || 'No'} followers
              </Text>
            </View>
          </View>
          <ScrollView horizontal={true} style={{ maxHeight: 100, flexDirection: 'row', marginTop: 10 }} contentContainerStyle={{ gap: 10, paddingBottom: 10, paddingHorizontal: 10 }} showsHorizontalScrollIndicator={false}>
            {karmaInfo.map((item) =>
              <Card key={item.header}>
                <Card.Title
                  title={item.header}
                  titleVariant="labelLarge"
                  titleStyle={{ minHeight: 10, margin: 0, padding: 0 }}
                  style={{ height: "max-content", margin: 0, padding: 0 }}
                />
                <Card.Content>
                  <Text variant="titleLarge" style={s.stat}>
                    {item.value || '--'}
                  </Text>
                </Card.Content>
              </Card>
            )}
          </ScrollView>
          <UserContent updates={updates} />
        </View>
      )}
    </View>
  );
}

export default MyProfileScreen;
