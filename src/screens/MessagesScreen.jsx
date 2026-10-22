import React from 'react';
import {
  FlatList,
  InteractionManager,
  ToastAndroid,
  View,
} from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  Icon,
  Portal,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { AppContext } from '../App';
import timesago from 'timesago';
import useInterval from '../hooks/useInterval';
import {
  fetchExploreGroupChats,
  getMyUsername,
  groupChatMemberCount,
  groupChatName,
  isGroupChat,
  joinGroupChat,
} from '../utils/groupChats';

const lastMessageText = item =>
  item?.messages?.length > 0
    ? item.messages[item.messages.length - 1]?.text || ''
    : 'No messages in this chat';

function MessageScreen({ navigation }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [tab, setTab] = React.useState('dms');
  const [chats, setChats] = React.useState([]);
  const [explore, setExplore] = React.useState([]);
  const [exploreError, setExploreError] = React.useState(null);
  const [joiningID, setJoiningID] = React.useState(null);
  const [joinTarget, setJoinTarget] = React.useState(null);
  const [joinName, setJoinName] = React.useState('');
  const [myUsername, setMyUsername] = React.useState(null);

  React.useEffect(() => {
    getMyUsername(API).then(setMyUsername);
  }, []);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        refresh(true);
      });
    }
  }, [isFocused]);

  useInterval(() => {
    if (isFocused) {
      fetchChats();
    }
  }, 15000);

  const fetchChats = async () => {
    try {
      const d = await API.getDMs();
      setChats(Array.isArray(d) ? d.filter(Boolean) : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExplore = async () => {
    try {
      setExplore(await fetchExploreGroupChats(API));
      setExploreError(null);
    } catch (err) {
      console.error(err);
      setExploreError("Couldn't load group chats to join.");
    }
  };

  const refresh = async manual => {
    if (manual) setManualRefreshing(true);
    await Promise.all([fetchChats(), fetchExplore()]);
    setManualRefreshing(false);
  };

  const dms = chats.filter(c => !isGroupChat(c));
  const joinedGroups = chats.filter(c => isGroupChat(c));
  const joinedIDs = new Set(joinedGroups.map(c => c.id));
  const joinable = explore.filter(c => !joinedIDs.has(c.id));

  const openChat = (item, isGroup) =>
    navigation.push('Thread', {
      mode: 'existing',
      chatID: item.id,
      isGroup,
      title: isGroup ? groupChatName(item) : undefined,
    });

  // Ask what name to use before joining
  const askToJoin = item => {
    setJoinName(myUsername || '');
    setJoinTarget(item);
  };

  const join = async (item, chosenName) => {
    setJoinTarget(null);
    setJoiningID(item.id);
    try {
      await joinGroupChat(API, item, chosenName);
      await fetchChats();
      openChat(item, true);
    } catch (err) {
      console.error(err);
      ToastAndroid.show("Couldn't join that group chat", ToastAndroid.SHORT);
    } finally {
      setJoiningID(null);
    }
  };

  const ChatCard = ({ item, isGroup }) => (
    <TouchableRipple
      borderless={true}
      onPress={() => openChat(item, isGroup)}
      style={{ borderRadius: 10 }}>
      <Surface
        style={{
          padding: 15,
          borderRadius: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 15,
        }}
        mode="elevated">
        <Icon
          source={isGroup ? 'account-group-outline' : 'message-reply-text-outline'}
          size={32}
          color={colors.primary}
        />
        <View style={{ flex: 1 }}>
          {isGroup && (
            <Text
              style={{ color: colors.onSurface, fontWeight: 'bold' }}
              variant="bodyLarge"
              numberOfLines={1}>
              {groupChatName(item)}
            </Text>
          )}
          <Text
            style={{ color: isGroup ? colors.onSurfaceVariant : colors.onSurface }}
            variant={isGroup ? 'bodyMedium' : 'bodyLarge'}
            numberOfLines={2}>
            {lastMessageText(item)}
          </Text>
          {item.updated_at && (
            <Text style={{ color: colors.onSurfaceVariant }} variant="labelMedium">
              {timesago(item.updated_at)}
            </Text>
          )}
        </View>
      </Surface>
    </TouchableRipple>
  );

  const ExploreCard = ({ item }) => {
    const count = groupChatMemberCount(item);
    return (
      <Surface
        style={{
          padding: 15,
          borderRadius: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 15,
        }}
        mode="flat">
        <Icon source="account-group" size={32} color={colors.secondary} />
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.onSurface, fontWeight: 'bold' }}
            variant="bodyLarge"
            numberOfLines={1}>
            {groupChatName(item)}
          </Text>
          {!!(item.description || count != null) && (
            <Text
              style={{ color: colors.onSurfaceVariant }}
              variant="labelMedium"
              numberOfLines={2}>
              {[item.description, count != null ? `${count} members` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>
        <Button
          mode="contained-tonal"
          loading={joiningID === item.id}
          disabled={joiningID !== null}
          onPress={() => askToJoin(item)}>
          Join
        </Button>
      </Surface>
    );
  };

  const SectionLabel = ({ children }) => (
    <Text
      variant="titleSmall"
      style={{ color: colors.primary, marginTop: 10, marginLeft: 5 }}>
      {children}
    </Text>
  );

  // Build one list for the group tab: joined chats, then joinable ones
  const groupData = [
    { kind: 'label', key: 'joined-label', text: 'Your group chats' },
    ...(joinedGroups.length
      ? joinedGroups.map(c => ({ kind: 'joined', key: 'j' + c.id, item: c }))
      : [{ kind: 'empty', key: 'joined-empty', text: "You haven't joined any group chats yet." }]),
    { kind: 'label', key: 'explore-label', text: 'Join a group chat' },
    ...(exploreError
      ? [{ kind: 'empty', key: 'explore-error', text: exploreError }]
      : joinable.length
        ? joinable.map(c => ({ kind: 'explore', key: 'e' + c.id, item: c }))
        : [{ kind: 'empty', key: 'explore-empty', text: 'No group chats available to join right now.' }]),
  ];

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Messages" />
      </Appbar.Header>
      <SegmentedButtons
        style={{ margin: 10, marginBottom: 0 }}
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'dms', label: 'DMs', icon: 'message-text-outline' },
          { value: 'groups', label: 'Group chats', icon: 'account-group-outline' },
        ]}
      />
      {tab === 'dms' ? (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10, gap: 10 }}
          data={dms}
          keyExtractor={item => item.id}
          onRefresh={() => refresh(true)}
          refreshing={manualRefreshing}
          renderItem={({ item }) => <ChatCard item={item} isGroup={false} />}
          ListFooterComponentStyle={{ alignItems: 'center', paddingTop: 30 }}
          ListFooterComponent={() => (
            <Icon
              source="message-processing-outline"
              size={128}
              color={colors.secondaryContainer}
            />
          )}
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10, gap: 10 }}
          data={groupData}
          keyExtractor={row => row.key}
          onRefresh={() => refresh(true)}
          refreshing={manualRefreshing}
          renderItem={({ item: row }) => {
            if (row.kind === 'label') return <SectionLabel>{row.text}</SectionLabel>;
            if (row.kind === 'empty')
              return (
                <Text
                  style={{ color: colors.onSurfaceVariant, marginLeft: 5 }}
                  variant="bodyMedium">
                  {row.text}
                </Text>
              );
            if (row.kind === 'joined') return <ChatCard item={row.item} isGroup={true} />;
            return <ExploreCard item={row.item} />;
          }}
        />
      )}
      <Portal>
        <Dialog visible={!!joinTarget} onDismiss={() => setJoinTarget(null)}>
          <Dialog.Title>Join {joinTarget ? groupChatName(joinTarget) : ''}</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodyMedium">
              Choose the name people in this chat will see.
            </Text>
            <TextInput
              mode="outlined"
              label="Your name in this chat"
              value={joinName}
              onChangeText={setJoinName}
              maxLength={30}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setJoinTarget(null)}>Cancel</Button>
            <Button onPress={() => join(joinTarget, 'Anonymous')}>
              Join anonymously
            </Button>
            <Button
              mode="contained"
              disabled={!joinName.trim()}
              onPress={() => join(joinTarget, joinName)}>
              Join
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

export default MessageScreen;
