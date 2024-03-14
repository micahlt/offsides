import React from 'react';
import { View, StatusBar, ScrollView, Image } from 'react-native';
import {
  Appbar,
  useTheme,
  Text,
  Card,
  Avatar,
  ProgressBar,
} from 'react-native-paper';
import { AppContext } from '../App';
import timesago from 'timesago';
import Group from '../components/Group';

const BORDER_RADIUS = 15;

function MyProfileScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [updates, setUpdates] = React.useState(false);
  const [groups, setGroups] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { colors } = useTheme();
  React.useEffect(() => {
    loadProfile();
  }, []);
  const loadProfile = async () => {
    const group = await API.getUpdates(appState.groupID);
    const user = await API.getCurrentUser();
    Promise.all(
      user.memberships.map(m => {
        return API.getGroupMetadata(m.groupId);
      }),
    ).then(data => {
      data = data.filter(g => {
        if (g) return true;
        else return false;
      });
      setGroups(data);
      setUpdates(group);
      setLoading(false);
    });
  };
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Your Profile" />
        <Appbar.Action
          onPress={() => navigation.navigate('Settings')}
          icon="cog"
        />
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={loading} />
      {updates?.user && (
        <ScrollView contentContainerStyle={{ rowGap: 10, padding: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {updates.user?.conversation_icon ? (
              <Avatar.Text
                size={64}
                label={String(updates.user?.conversation_icon?.emoji || '‼️')}
                color="white"
                style={{
                  backgroundColor:
                    updates.user?.conversation_icon?.secondary_color ||
                    colors.primary,
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
                <Text variant="titleLarge">{updates.user.follower_count}</Text>
              </Card.Content>
            </Card>
            <Card style={{ flexGrow: 1 }}>
              <Card.Title
                title="School Karma"
                titleVariant="labelLarge"
                titleStyle={{ minHeight: 10 }}
              />
              <Card.Content>
                <Text variant="titleLarge">
                  {updates.karma.groups[0].yakarma}
                </Text>
              </Card.Content>
            </Card>
          </View>
          <Card style={{ flexGrow: 1 }}>
            <Card.Title
              title="My Groups"
              titleVariant="labelLarge"
              titleStyle={{ minHeight: 10 }}
            />
            <Card.Content style={{ rowGap: 10 }}>
              {groups.map(group => (
                <Group group={group} key={group.id} />
              ))}
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

export default MyProfileScreen;
