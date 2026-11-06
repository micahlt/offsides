import React from 'react';
import { FlatList, InteractionManager, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Icon,
  ProgressBar,
  Searchbar,
  SegmentedButtons,
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

function MessageScreen({ navigation }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [dms, setDMs] = React.useState([]);
  const [groupChats, setGroupChats] = React.useState([]);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [view, setView] = React.useState('dms');
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [joiningChatID, setJoiningChatID] = React.useState(null);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');

  const normalizeGroupChats = React.useCallback(payload => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.chats)) {
      return payload.chats;
    }

    if (Array.isArray(payload?.group_chats)) {
      return payload.group_chats;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    return [];
  }, []);

  const fetchCurrentUser = React.useCallback(async () => {
    try {
      const updates = await API.getUpdates();
      setCurrentUser(updates?.user || null);
    } catch (e) {
      setCurrentUser(null);
    }
  }, [API]);

  const fetchDMs = React.useCallback(async manual => {
    if (manual) {
      setManualRefreshing(true);
    }
    setLoading(true);
    try {
      const d = await API.getDMs();
      setDMs(d || []);
    } catch (e) {
      setError(e.message || 'Could not load DMs.');
    } finally {
      setManualRefreshing(false);
      setLoading(false);
    }
  }, [API]);

  const fetchGroupChats = React.useCallback(async manual => {
    if (manual) {
      setManualRefreshing(true);
    }
    setLoading(true);
    try {
      const res = await API.sendRequest(
        `/v1/chats/explore?cacheBust=${Date.now()}`,
      );
      if (!res.ok) {
        throw new Error('Could not load group chats.');
      }

      const json = await res.json();
      setGroupChats(normalizeGroupChats(json));
    } catch (e) {
      setGroupChats([]);
      setError('Could not load group chats.');
    } finally {
      setManualRefreshing(false);
      setLoading(false);
    }
  }, [API, normalizeGroupChats]);

  const fetchAll = React.useCallback(async manual => {
    await Promise.all([fetchDMs(manual), fetchGroupChats(false), fetchCurrentUser()]);
  }, [fetchCurrentUser, fetchDMs, fetchGroupChats]);

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        fetchAll(true);
      });
    }
  }, [fetchAll, isFocused]);

  useInterval(() => {
    if (isFocused) {
      fetchDMs(false);
    }
  }, 15000);

  const joinGroupChat = async chat => {
    const chatID = chat?.id || chat?.chat_id || chat?.chat?.id;
    if (!chatID) {
      return;
    }
    setJoiningChatID(chatID);
    try {
      const icon = currentUser?.conversation_icon || {};
      const joined = await API.joinGroupChat(
        chatID,
        currentUser?.username || 'Offsides',
        icon.emoji || '💬',
        icon.color || colors.primary,
        icon.secondary_color || colors.secondary,
      );
      const joinedID = joined?.chat?.id || joined?.id || chatID;
      navigation.push('Thread', {
        mode: 'existing',
        chatID: joinedID,
        title: chat?.name || chat?.title || 'Group chat',
        isGroupChat: true,
      });
    } catch (e) {
      setError(e.message || 'Could not join this group chat.');
    } finally {
      setJoiningChatID(null);
    }
  };

  const normalizeText = value => String(value || '').toLowerCase();
  const filteredDMs = React.useMemo(() => {
    const q = normalizeText(query);
    return dms.filter(item => {
      const last = item.messages?.[item.messages.length - 1]?.text;
      return !q || normalizeText(last).includes(q) || normalizeText(item.type).includes(q);
    });
  }, [dms, query]);

  const getGroupChatTitle = React.useCallback(item => {
    return (
      item?.name ||
      item?.title ||
      item?.display_name ||
      item?.chat?.name ||
      item?.chat?.title ||
      item?.channel?.name ||
      item?.channel?.title ||
      item?.group?.name ||
      item?.group_chat?.name ||
      'Group chat'
    );
  }, []);

  const getGroupChatDescription = React.useCallback(item => {
    return (
      item?.description ||
      item?.subtitle ||
      item?.topic ||
      item?.chat?.description ||
      item?.channel?.description ||
      item?.group_chat?.description ||
      ''
    );
  }, []);

  const getGroupChatMemberCount = React.useCallback(item => {
    return (
      item?.member_count ||
      item?.members_count ||
      item?.participant_count ||
      item?.chat?.member_count ||
      item?.channel?.member_count ||
      item?.group_chat?.member_count
    );
  }, []);

  const filteredGroupChats = React.useMemo(() => {
    const q = normalizeText(query);
    return groupChats.filter(item => {
      const title = getGroupChatTitle(item);
      const description = getGroupChatDescription(item);
      return (
        !q ||
        normalizeText(title).includes(q) ||
        normalizeText(description).includes(q)
      );
    });
  }, [getGroupChatDescription, getGroupChatTitle, groupChats, query]);

  const renderDM = ({ item }) => {
    const lastMessage = item.messages?.[item.messages.length - 1];
    const preview = lastMessage?.text || 'No messages in this chat yet';
    return (
      <TouchableRipple
        borderless={true}
        onPress={() =>
          navigation.push('Thread', {
            mode: 'existing',
            chatID: item.id,
            title: item.type === 'comment' ? 'Comment thread' : 'Post thread',
          })
        }
        style={styles.row}
        key={item.id}>
        <Surface
          style={[styles.messageCard, { backgroundColor: colors.elevation.level1 }]}
          mode="flat">
          <Icon
            source={item.type === 'comment' ? 'comment-text-outline' : 'message-reply-text-outline'}
            size={32}
            color={colors.primary}
          />
          <View style={styles.messageContent}>
            <Text
              style={{ color: colors.onSurface }}
              numberOfLines={2}
              variant="bodyLarge">
              {preview}
            </Text>
            <Text
              style={{ color: colors.onSurfaceVariant }}
              variant="labelMedium">
              {item.updated_at ? timesago(item.updated_at) : 'No activity yet'}
            </Text>
          </View>
          <Icon source="chevron-right" size={22} color={colors.onSurfaceDisabled} />
        </Surface>
      </TouchableRipple>
    );
  };

  const renderGroupChat = ({ item }) => {
    const chatID = item?.id || item?.chat_id || item?.chat?.id;
    const title = getGroupChatTitle(item);
    const description = getGroupChatDescription(item);
    const memberCount = getGroupChatMemberCount(item);
    return (
      <Surface
        style={[styles.groupChatCard, { backgroundColor: colors.elevation.level1 }]}
        mode="flat">
        <View style={styles.groupChatIcon}>
          <Icon source="account-group" size={32} color={colors.primary} />
        </View>
        <View style={styles.messageContent}>
          <Text variant="titleMedium" numberOfLines={1}>
            {title}
          </Text>
          {!!description && (
            <Text
              variant="bodyMedium"
              numberOfLines={2}
              style={{ color: colors.onSurfaceVariant }}>
              {description}
            </Text>
          )}
          {!!memberCount && (
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
              {memberCount} members
            </Text>
          )}
        </View>
        <Button
          mode="contained-tonal"
          compact={true}
          disabled={!chatID || joiningChatID === chatID}
          loading={joiningChatID === chatID}
          onPress={() => joinGroupChat(item)}>
          Join
        </Button>
      </Surface>
    );
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Messages" />
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={loading && !manualRefreshing} />
      <View style={styles.controls}>
        <SegmentedButtons
          density="small"
          value={view}
          onValueChange={setView}
          buttons={[
            { value: 'dms', label: 'DMs', icon: 'message-text-outline' },
            { value: 'groups', label: 'Group chats', icon: 'account-group' },
          ]}
        />
        <Searchbar
          placeholder={view === 'dms' ? 'Search DMs' : 'Search group chats'}
          value={query}
          onChangeText={setQuery}
          style={{ backgroundColor: colors.elevation.level1 }}
        />
      </View>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        data={view === 'dms' ? filteredDMs : filteredGroupChats}
        onRefresh={() => view === 'dms' ? fetchDMs(true) : fetchGroupChats(true)}
        refreshing={manualRefreshing}
        renderItem={view === 'dms' ? renderDM : renderGroupChat}
        keyExtractor={(item, index) => item.id || item.chat_id || item.chat?.id || String(index)}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Icon
              source={view === 'dms' ? 'message-processing-outline' : 'account-group-outline'}
              size={96}
              color={colors.secondaryContainer}
            />
            <Text variant="titleMedium">
              {query ? 'No matches' : view === 'dms' ? 'No DMs yet' : 'No group chats found'}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              {view === 'dms'
                ? 'Start one from a post or comment.'
                : 'Pull to refresh or try another search.'}
            </Text>
          </View>
        )}
      />
      <Snackbar visible={!!error} onDismiss={() => setError('')}>
        {error}
      </Snackbar>
    </View>
  );
}

export default MessageScreen;

const styles = StyleSheet.create({
  controls: {
    gap: 10,
    padding: 10,
  },
  listContent: {
    gap: 10,
    padding: 10,
    paddingTop: 0,
  },
  row: {
    borderRadius: 12,
  },
  messageCard: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  groupChatCard: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  groupChatIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 4,
    textAlign: 'center',
  },
});
