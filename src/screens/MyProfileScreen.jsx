import React from 'react';
import { View, StatusBar, ScrollView, Image, StyleSheet } from 'react-native';
import {
  Appbar,
  useTheme,
  Text,
  Card,
  Avatar,
  ProgressBar,
  TouchableRipple,
  IconButton,
  Divider,
  Icon,
  Button,
} from 'react-native-paper';
import { AppContext } from '../App';
import timesago from 'timesago';
import { useFocusEffect } from '@react-navigation/native';
import ActivityItem from '../components/ActivityItem';

const BORDER_RADIUS = 15;

function MyProfileScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [updates, setUpdates] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { colors } = useTheme();
  useFocusEffect(() => {
    loadProfile();
  });
  const loadProfile = async () => {
    const u = await API.getUpdates(appState.groupID);
    setUpdates(u);
    setLoading(false);
  };
  const s = StyleSheet.create({
    stat: { fontWeight: 900, color: colors.primary },
  });
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
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
          onPress={() => navigation.navigate('Settings')}
          icon="cog"
        />
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={loading} />
      {updates?.user && (
        <ScrollView contentContainerStyle={{ rowGap: 10, padding: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableRipple
              borderless={true}
              style={{ borderRadius: BORDER_RADIUS }}
              onPress={() => navigation.navigate('EditProfile')}>
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
              onPress={() => navigation.navigate('EditProfile')}>
              Edit
            </Button>
            <Text
              variant="titleMedium"
              style={{ textAlign: 'right', flexGrow: 1, marginRight: 10 }}>
              joined {timesago(updates.user.created_at)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flexGrow: 1 }}>
              <Card.Title
                title="Followers"
                titleVariant="labelLarge"
                titleStyle={{ minHeight: 10 }}
              />
              <Card.Content>
                <Text variant="titleLarge" style={s.stat}>
                  {updates.user.follower_count}
                </Text>
              </Card.Content>
            </Card>
            <Card style={{ flexGrow: 1 }}>
              <Card.Title
                title="Post Karma"
                titleVariant="labelLarge"
                titleStyle={{ minHeight: 10 }}
              />
              <Card.Content>
                <Text variant="titleLarge" style={s.stat}>
                  {updates.karma.post}
                </Text>
              </Card.Content>
            </Card>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flexGrow: 1 }}>
              <Card.Title
                title="Groups"
                titleVariant="labelLarge"
                titleStyle={{ minHeight: 10 }}
              />
              <Card.Content>
                <Text variant="titleLarge" style={s.stat}>
                  {updates.groups.length}
                </Text>
              </Card.Content>
            </Card>
            <Card style={{ flexGrow: 1 }}>
              <Card.Title
                title="Comment Karma"
                titleVariant="labelLarge"
                titleStyle={{ minHeight: 10 }}
              />
              <Card.Content>
                <Text variant="titleLarge" style={s.stat}>
                  {updates.karma.comment}
                </Text>
              </Card.Content>
            </Card>
          </View>
          <Divider />
          <Card>
            <Card.Title
              title="Activity"
              titleVariant="labelLarge"
              titleStyle={{ minHeight: 10 }}
            />
            {updates.activity_items?.items &&
            updates.activity_items?.items?.filter(i => !i.is_seen).length >
              0 ? (
              <Card.Content style={{ rowGap: 8 }}>
                {updates.activity_items.items
                  .filter(i => !i.is_seen)
                  .map(activity => (
                    <ActivityItem activity={activity} key={activity.id} />
                  ))}
              </Card.Content>
            ) : (
              <Card.Content style={{ alignItems: 'center' }}>
                <IconButton
                  icon="bell-badge"
                  size={64}
                  iconColor={colors.outline}
                />
                <Text style={{ marginBottom: 20, color: colors.outline }}>
                  No recent activity
                </Text>
              </Card.Content>
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

export default MyProfileScreen;
