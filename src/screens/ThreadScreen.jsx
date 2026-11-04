import React, { useCallback } from 'react';
import { FlatList, InteractionManager, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  IconButton,
  Snackbar,
  Surface,
  Text,
  TextInput,
  Tooltip,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../App';
import timesago from 'timesago';
import DeviceInfo from 'react-native-device-info';
import { sha256 } from 'js-sha256';
import useInterval from '../hooks/useInterval';
import UserAvatar from '../components/UserAvatar';
import { getMessages, isGroupChat, mergeMessages } from '../utils/getChats';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import sendChatMessage from '../utils/sendChatMessage';

// The API dedupes messages by client_id, so it must be unique per message.
// Reusing one device-derived ID makes every send after the first in a thread
// return 200 with the earlier message and silently drop the new one.
const newClientID = async () => {
  const id = await DeviceInfo.getAndroidId();
  return sha256(`${id}-${Date.now()}-${Math.random()}`);
};

// Group chat messages carry either the sender's profile (identity) or, for
// anonymous senders, just a number - the same scheme as anonymous comments.
const aliasName = position =>
  position != null ? `Anonymous #${position}` : 'Anonymous';

const senderKey = message =>
  message?.type != 'message'
    ? null
    : message.identity
      ? message.obfuscated_user_id
      : `#${message.anonymous_alias_position}`;

function ThreadScreen({ navigation, route }) {
  const { postID, chatID } = route.params;
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [meta, setMeta] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [isFetching, setIsFetching] = React.useState(false);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const [messageDraft, setMessageDraft] = React.useState('');
  const [error, setError] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  // The message being replied to, chosen by long-pressing it.
  const [replyTo, setReplyTo] = React.useState(null);
  // undefined until the first page loads; null once the start is reached.
  const [olderCursor, setOlderCursor] = React.useState(undefined);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const loadingOlderRef = React.useRef(false);
  const [sending, setSending] = React.useState(false);
  const sendingRef = React.useRef(false);
  const isGroup = isGroupChat(meta);

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        if (chatID) {
          fetchMessages(true);
        }
      });
    }
  }, [isFocused]);

  useInterval(() => {
    if (chatID && isFocused) {
      fetchMessages(false);
    }
  }, 5000);

  // id is passed right after a DM is started, before chatID has updated.
  const fetchMessages = async (manual, id = chatID) => {
    if (!isFetching) {
      setIsFetching(true);
      if (manual) {
        setManualRefreshing(true);
      }
      try {
        const { chat, cursor } = await getMessages(API, id);
        // Merge rather than replace, or older messages scrolled back to vanish.
        setMessages(current => mergeMessages(current, chat.messages));
        setMeta(chat);
        setOlderCursor(c => (c === undefined ? cursor : c));
      } catch (e) {
        // Background polls fail silently - only a manual pull should complain.
        if (manual) {
          setError(true);
        }
      } finally {
        setManualRefreshing(false);
        setIsFetching(false);
      }
    }
  };

  const loadOlder = async () => {
    if (!olderCursor || loadingOlderRef.current) {
      return;
    }
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const { chat, cursor } = await getMessages(API, chatID, olderCursor);
      setMessages(current => mergeMessages(current, chat.messages));
      setOlderCursor(cursor);
    } catch (e) {
      setError(true);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  };

  // Puts a failed message back without losing anything typed or picked since.
  const restoreDraft = (text, target) => {
    setMessageDraft(cur => (cur ? `${text} ${cur}` : text));
    setReplyTo(cur => cur ?? target);
  };

  const sendMessage = async () => {
    const text = messageDraft;
    if (sendingRef.current || !text.trim()) {
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setMessageDraft('');
    const target = replyTo;
    setReplyTo(null);
    try {
      const clientID = await newClientID();
      const { outcome, status } = await sendChatMessage(
        API,
        chatID,
        text,
        clientID,
        target,
      );
      // Replies are an experiment - say what the server did with this one.
      if (outcome == 'ignored') {
        setNotice('Sent, but not as a reply - the server ignored it.');
      } else if (outcome == 'rejected') {
        setNotice(
          `Sent, but not as a reply - the server rejected it (HTTP ${status}).`,
        );
      }
      await fetchMessages(false);
    } catch (e) {
      // Put the draft (and the reply) back so the message isn't lost.
      restoreDraft(text, target);
      setError(true);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const startThread = async () => {
    const text = messageDraft;
    if (sendingRef.current || !text.trim()) {
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setMessageDraft('');
    try {
      const clientID = await newClientID();
      const newDM = await API.startDM(text, clientID, postID);
      navigation.setParams({ chatID: newDM.chat.id });
      // The focus effect won't rerun for the new chatID, so load it now.
      await fetchMessages(false, newDM.chat.id);
    } catch (e) {
      restoreDraft(text, null);
      setError(true);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const leaveChat = async () => {
    return; // Waiting for sidechat.js implementation
  };

  const goToSource = async () => {
    if (!meta) return;
    try {
      const p = await API.getPost(meta.post_id, false);
      if (!p) {
        setNotice('The original post is no longer available.');
      } else if ((await p.type) == 'post') {
        navigation.push('Comments', {
          postID: meta.post_id,
          postObj: p,
        });
      } else if ((await p.type) == 'comment') {
        navigation.push('Comments', {
          postID: p.parent_post_id,
        });
      }
    } catch (e) {
      setError(true);
    }
  };

  const renderMessage = ({ item, index }) => {
    // Joins, leaves and other notices aren't anyone's message.
    if (item.type == 'status') {
      return (
        <Text
          variant="labelMedium"
          style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
          {item.text}
        </Text>
      );
    }
    const mine = item.authored_by_user;
    const sender = mine
      ? 'You'
      : isGroup
        ? item.identity?.display_name ||
          aliasName(item.anonymous_alias_position)
        : 'Them';
    // The list is newest first, so index + 1 is the message shown above this
    // one; only the first of a run from the same sender gets their name.
    const showSender =
      isGroup && !mine && senderKey(messages[index + 1]) != senderKey(item);
    const reply = item.reply_to;
    const replyName = reply?.authored_by_user
      ? 'You'
      : reply?.identity?.display_name ||
        (reply?.anonymous_alias_position != null
          ? aliasName(reply.anonymous_alias_position)
          : null);
    return (
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          marginLeft: mine ? 50 : 0,
          marginRight: mine ? 0 : 50,
        }}>
        {isGroup && !mine && (
          <View style={{ width: 32 }}>
            {showSender && (
              <UserAvatar
                size={32}
                borderRadius={8}
                conversationIcon={item.identity}
                numberAlias={
                  item.identity ? false : `#${item.anonymous_alias_position}`
                }
              />
            )}
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          {showSender && (
            <Text
              variant="labelMedium"
              style={{ color: colors.onSurfaceVariant }}>
              {sender}
            </Text>
          )}
          <TouchableRipple
            borderless={true}
            onPress={() => {}}
            // Only group chats have replies; DMs don't support them.
            onLongPress={
              isGroup ? () => setReplyTo({ ...item, sender }) : undefined
            }
            style={{ borderRadius: 10 }}>
            <Surface
              style={{
                padding: 15,
                borderRadius: 10,
                backgroundColor: mine
                  ? colors.secondaryContainer
                  : colors.elevation.level1,
              }}
              mode="flat">
              {reply && (
                <View
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: colors.outline,
                    paddingLeft: 8,
                    marginBottom: 8,
                  }}>
                  {replyName && (
                    <Text
                      variant="labelMedium"
                      style={{ color: colors.onSurfaceVariant }}>
                      {replyName}
                    </Text>
                  )}
                  <Text
                    variant="bodyMedium"
                    numberOfLines={2}
                    style={{ color: colors.onSurfaceVariant }}>
                    {reply.state == 'visible' && reply.text
                      ? reply.text
                      : 'Message unavailable'}
                  </Text>
                </View>
              )}
              <Text style={{ color: colors.onSurface }} variant="bodyLarge">
                {item.text}
              </Text>
              <Text
                style={{ color: colors.onSurfaceDisabled }}
                variant="labelMedium">
                {timesago(item.created_at)}
              </Text>
            </Surface>
          </TouchableRipple>
        </View>
      </View>
    );
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isGroup ? meta.name : 'Thread'} />
        {!isGroup && (
          <Tooltip title="Show context">
            <Appbar.Action
              icon="note-text-outline"
              onPress={() => goToSource()}
            />
          </Tooltip>
        )}
      </Appbar.Header>
      {/* Shrinking the whole area for the keyboard keeps the newest messages
          just above the input, since the inverted list is pinned to the bottom. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* Messages are newest first, so the inverted list starts at the bottom
          and its "end" is the top, where older pages load in. */}
        <FlatList
          inverted={true}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10, gap: 10 }}
          data={messages}
          keyExtractor={item => item.id}
          onRefresh={() => fetchMessages(true)}
          refreshing={manualRefreshing}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingOlder ? <ActivityIndicator style={{ margin: 10 }} /> : null
          }
          renderItem={renderMessage}
        />
        {replyTo && (
          <Surface
            mode="flat"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 15,
              backgroundColor: colors.elevation.level2,
            }}>
            <View
              style={{
                flex: 1,
                borderLeftWidth: 3,
                borderLeftColor: colors.primary,
                paddingLeft: 8,
                marginVertical: 8,
              }}>
              <Text variant="labelMedium" style={{ color: colors.primary }}>
                Replying to{' '}
                {replyTo.sender == 'You' ? 'yourself' : replyTo.sender}
              </Text>
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={{ color: colors.onSurfaceVariant }}>
                {replyTo.text}
              </Text>
            </View>
            <IconButton
              icon="close"
              accessibilityLabel="Cancel reply"
              onPress={() => setReplyTo(null)}
            />
          </Surface>
        )}
        <TextInput
          value={messageDraft}
          onChangeText={setMessageDraft}
          onSubmitEditing={() => {
            if (chatID) {
              sendMessage();
            } else {
              startThread();
            }
          }}
          autoFocus={true}
          placeholder="Send a message"
          style={{ paddingBottom: insets.bottom }}
          right={
            <TextInput.Icon
              icon="send"
              disabled={sending || !messageDraft.trim()}
              onPress={() => {
                if (chatID) {
                  sendMessage();
                } else {
                  startThread();
                }
              }}
            />
          }
        />
      </KeyboardAvoidingView>
      <Snackbar visible={error} onDismiss={() => setError(false)}>
        Sorry, that didn't go through. Check your connection.
      </Snackbar>
      <Snackbar visible={!!notice} onDismiss={() => setNotice('')}>
        {notice}
      </Snackbar>
    </View>
  );
}

export default ThreadScreen;
