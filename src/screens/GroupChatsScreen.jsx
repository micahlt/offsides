import React from 'react';
import { FlatList, InteractionManager, View } from 'react-native';
import {
  Appbar,
  Avatar,
  Button,
  Icon,
  Snackbar,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { AppContext } from '../App';
import timesago from 'timesago';
import useInterval from '../hooks/useInterval';
import getChats, { isGroupChat, mergeChats } from '../utils/getChats';

function GroupChatsScreen({ navigation }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [chats, setChats] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);
  // The last full load failed, so the list may be missing chats you're in.
  const [loadFailed, setLoadFailed] = React.useState(false);

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        fetchChats(true);
      });
    }
  }, [isFocused]);

  useInterval(() => {
    if (isFocused) {
      fetchChats(false);
    }
  }, 15000);

  // DMs come back from the same endpoint; this screen only keeps group chats.
  const fetchChats = async manual => {
    if (manual) {
      setManualRefreshing(true);
    }
    try {
      if (manual) {
        const c = await getChats(API);
        setChats(c.filter(isGroupChat));
        setLoadFailed(false);
      } else {
        const latest = await getChats(API, 1);
        setChats(current => mergeChats(current, latest.filter(isGroupChat)));
      }
    } catch (e) {
      if (manual) {
        setError(true);
        setLoadFailed(true);
      }
    } finally {
      setManualRefreshing(false);
      setLoaded(true);
    }
  };

  const findChats = () =>
    navigation.push('ExploreChats', { joinedIDs: chats.map(c => c.id) });

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Group Chats" />
        {/* Explore marks chats you're in from this list, so it has to be complete. */}
        <Appbar.Action
          icon="magnify"
          onPress={findChats}
          disabled={loadFailed}
        />
      </Appbar.Header>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, gap: 10 }}
        data={chats}
        ListHeaderComponent={
          loadFailed && chats.length ? (
            <Text
              variant="labelMedium"
              style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              Some chats may be missing. Pull down to refresh.
            </Text>
          ) : null
        }
        onRefresh={() => fetchChats(true)}
        refreshing={manualRefreshing}
        renderItem={({ item }) => (
          <TouchableRipple
            borderless={true}
            onPress={() =>
              navigation.push('Thread', {
                mode: 'existing',
                chatID: item.id,
              })
            }
            style={{ borderRadius: 10 }}
            key={item.id}>
            <Surface
              style={{
                padding: 15,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 15,
              }}
              mode="elevated">
              {item.icon_url ? (
                <Avatar.Image size={40} source={{ uri: item.icon_url }} />
              ) : (
                <Icon
                  source="account-group-outline"
                  size={32}
                  color={colors.primary}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.onSurface }} variant="bodyLarge">
                  {item.name || 'Group chat'}
                </Text>
                <Text
                  style={{ color: colors.onSurfaceVariant }}
                  variant="labelMedium">
                  {item.member_count != null
                    ? `${item.member_count} members · `
                    : ''}
                  {timesago(item.updated_at)}
                </Text>
              </View>
            </Surface>
          </TouchableRipple>
        )}
        ListEmptyComponent={
          loaded && loadFailed ? (
            <View style={{ alignItems: 'center', gap: 15, paddingTop: 30 }}>
              <Text
                variant="bodyLarge"
                style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
                Your group chats couldn't be loaded.
              </Text>
              <Button mode="contained" onPress={() => fetchChats(true)}>
                Try again
              </Button>
            </View>
          ) : loaded ? (
            <View style={{ alignItems: 'center', gap: 15, paddingTop: 30 }}>
              <Text
                variant="bodyLarge"
                style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
                You haven't joined any group chats yet.
              </Text>
              <Button mode="contained" onPress={findChats}>
                Find group chats
              </Button>
            </View>
          ) : null
        }
      />
      <Snackbar visible={error} onDismiss={() => setError(false)}>
        Sorry, your group chats couldn't be loaded.
      </Snackbar>
    </View>
  );
}

export default GroupChatsScreen;
