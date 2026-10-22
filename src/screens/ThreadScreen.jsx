import React, { useCallback } from 'react';
import { Alert, FlatList, InteractionManager, ToastAndroid, View } from 'react-native';
import {
  Appbar,
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
import {
  groupChatName,
  identityName,
  isGroupChat,
  leaveGroupChat,
  startGroupDM,
} from '../utils/groupChats';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';

function ThreadScreen({ navigation, route }) {
  const {
    postID,
    chatID,
    title,
    postContext,
    recipientName,
    groupChatID,
    sourceMessageID,
    myIdentity,
  } = route.params;
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

  const fetchMessages = async manual => {
    if (!isFetching) {
      setIsFetching(true);
      if (manual) {
        setManualRefreshing(true);
      }
      try {
        const d = await API.getDMThread(chatID);
        if (d?.messages) {
          setMessages(d.messages);
          setMeta(d);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setManualRefreshing(false);
        setIsFetching(false);
      }
    }
  };

  // The server uses client_id to de-duplicate messages. Sending the same
  // device-wide ID with every message made the server treat every message
  // after the first as a duplicate and silently drop it. Each message now
  // gets its own unique ID instead.
  const newClientID = async () => {
    const id = await DeviceInfo.getAndroidId();
    const seed = `${id}-${Date.now()}-${Math.random()}-${Math.random()}`;
    const h = sha256(seed);
    // Format as a UUID (version 4 layout)
    return [
      h.slice(0, 8),
      h.slice(8, 12),
      '4' + h.slice(13, 16),
      ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
      h.slice(20, 32),
    ].join('-');
  };

  const isSending = React.useRef(false);

  const sendMessage = async () => {
    const text = messageDraft.trim();
    if (!text || isSending.current) return;
    isSending.current = true;
    setMessageDraft('');
    try {
      const clientID = await newClientID();
      await API.sendDM(chatID, text, clientID);
      await fetchMessages(false);
    } catch (err) {
      console.error(err);
      setMessageDraft(text); // give the text back so it isn't lost
      ToastAndroid.show('Message failed to send', ToastAndroid.SHORT);
    } finally {
      isSending.current = false;
    }
  };

  const startThread = async () => {
    const text = messageDraft.trim();
    if (!text || isSending.current) return;
    isSending.current = true;
    setMessageDraft('');
    try {
      const clientID = await newClientID();
      // Private chat started from a group chat message
      if (groupChatID && sourceMessageID) {
        try {
          const { chatID: newID } = await startGroupDM(API, {
            groupChatID,
            messageID: sourceMessageID,
            text,
            clientID,
            firstMessageClientID: await newClientID(),
            identity: myIdentity,
          });
          navigation.setParams({ chatID: newID, isGroup: true });
        } catch (err) {
          if (err.chatID) {
            // Chat exists; only the first message failed. Open it and keep the text.
            navigation.setParams({ chatID: err.chatID, isGroup: true });
          }
          setMessageDraft(text);
          Alert.alert(
            err.chatID ? 'Message not sent' : "Couldn't start private chat",
            (err.chatID
              ? 'The chat was created, but your message failed. Tap send to try again.'
              : 'Yik Yak rejected the request.') +
              '\n\n' +
              (err.details || [err.message]).join('\n'),
          );
        }
        return;
      }
      const newDM = await API.startDM(
        text,
        clientID,
        postID,
        false,
        postContext || 'feed',
      );
      if (!newDM?.chat?.id) {
        const reason = newDM?.message || newDM?.error_code || 'no chat returned';
        throw new Error(String(reason));
      }
      navigation.setParams({ chatID: newDM.chat.id });
    } catch (err) {
      console.error(err);
      setMessageDraft(text);
      ToastAndroid.show(`Could not start chat: ${err.message}`, ToastAndroid.LONG);
    } finally {
      isSending.current = false;
    }
  };

  // Load the conversation as soon as a new chat is created
  React.useEffect(() => {
    if (chatID) {
      fetchMessages(false);
    }
  }, [chatID]);

  const isGroup = !!route.params.isGroup || isGroupChat(meta);

  // Name of whoever sent a message in a group chat, if the API includes it
  const senderName = item =>
    item?.identity?.display_name ||
    item?.identity?.name ||
    item?.sender?.display_name ||
    item?.sender?.name ||
    item?.author?.display_name ||
    item?.author?.name ||
    item?.display_name ||
    item?.alias ||
    null;

  // Join/leave notices in group chats ("X joined the chat", etc.)
  const isSystemMessage = item => {
    if (!isGroup || !item) return false;
    const kind = String(item.type || item.message_type || item.kind || '').toLowerCase();
    if (/system|event|join|leave|left|member/.test(kind)) return true;
    if (item.authored_by_user || senderName(item)) return false;
    return /^.{1,60} (joined|rejoined|left|was removed from|was added to|created|renamed) the (chat|group)\.?$/i.test(
      String(item.text || '').trim(),
    );
  };

  // Long-press a group chat message to DM the person who sent it
  const offerPrivateMessage = item => {
    if (!isGroup || item.authored_by_user || isSystemMessage(item)) return;
    const name = senderName(item) || 'this person';
    Alert.alert(name, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Message privately',
        onPress: () =>
          navigation.push('Thread', {
            groupChatID: item.chat_id || chatID,
            sourceMessageID: item.id,
            myIdentity: meta?.user?.identity,
            recipientName: name,
          }),
      },
    ]);
  };

  // Shows how the server labels this chat (no private data), to help
  // work out how DMs from group chats are started.
  const showChatInfo = () => {
    if (!meta) {
      ToastAndroid.show('Chat info not loaded yet', ToastAndroid.SHORT);
      return;
    }
    const skip = new Set(['messages', 'participants', 'members']);
    const lines = Object.keys(meta)
      .filter(k => !skip.has(k))
      .map(k => {
        const v = meta[k];
        if (v === null || v === undefined) return `${k}: none`;
        if (typeof v === 'object') return `${k}: {${Object.keys(v).join(', ')}}`;
        const str = String(v);
        return `${k}: ${str.length > 40 ? str.slice(0, 40) + '…' : str}`;
      });
    const first = meta.messages?.[0];
    if (first) {
      lines.push('', 'message fields: ' + Object.keys(first).join(', '));
    }
    if (Array.isArray(meta.participants)) {
      lines.push(`participants: ${meta.participants.length}`);
    }
    Alert.alert('Chat info', lines.join('\n'));
  };

  const leaveChat = () => {
    Alert.alert(
      'Leave this chat?',
      "You'll stop getting its messages. You can rejoin open group chats later.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const via = await leaveGroupChat(API, chatID);
              ToastAndroid.show(`Left the chat (format: ${via})`, ToastAndroid.LONG);
              navigation.goBack();
            } catch (err) {
              Alert.alert(
                "Couldn't leave the chat",
                'Screenshot this and send it to Claude:\n\n' +
                  (err.details || [err.message]).join('\n'),
              );
            }
          },
        },
      ],
    );
  };

  const goToSource = async () => {
    if (!meta) return;
    // DMs started from somewhere other than the feed (e.g. a group chat)
    // can't be opened as a post, so show where they came from instead.
    if (meta.post_context && meta.post_context !== 'feed') {
      ToastAndroid.show(
        `Started from: ${meta.post_context} (${meta.type || 'unknown'})`,
        ToastAndroid.LONG,
      );
      return;
    }
    const p = await API.getPost(meta.post_id, false);
    if ((await p.type) == 'post') {
      navigation.push('Comments', {
        postID: meta.post_id,
        postObj: p,
      });
    } else if ((await p.type) == 'comment') {
      navigation.push('Comments', {
        postID: p.parent_post_id,
      });
    }
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={
            isGroup
              ? title || groupChatName(meta)
              : recipientName && !chatID
                ? `Message ${recipientName}`
                : 'Thread'
          }
        />
        {chatID && (
          <Appbar.Action
            icon="information-outline"
            onPress={() => showChatInfo()}
          />
        )}
        {chatID && isGroup && (
          <Appbar.Action icon="exit-run" onPress={() => leaveChat()} />
        )}
        {!isGroup && (
          <Tooltip title="Show context">
            <Appbar.Action
              icon="note-text-outline"
              onPress={() => goToSource()}
            />
          </Tooltip>
        )}
      </Appbar.Header>
      <FlatList
        inverted={true}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 10,
          gap: 10,
          flexDirection: 'column-reverse',
        }}
        data={messages}
        onRefresh={() => fetchMessages(true)}
        refreshing={manualRefreshing}
        renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}
        renderItem={({ item }) =>
          isSystemMessage(item) ? (
            <Text
              key={item.id}
              style={{
                color: colors.onSurfaceVariant,
                textAlign: 'center',
                paddingHorizontal: 20,
              }}
              variant="labelMedium">
              {item.text}
              {item.created_at ? ` · ${timesago(item.created_at)}` : ''}
            </Text>
          ) : (
          <TouchableRipple
            borderless={true}
            onPress={() => { }}
            onLongPress={() => offerPrivateMessage(item)}
            style={{
              borderRadius: 10,
              marginLeft: item.authored_by_user ? 50 : 0,
              marginRight: item.authored_by_user ? 0 : 50,
            }}>
            <Surface
              key={item.id}
              style={{
                padding: 15,
                borderRadius: 10,
                backgroundColor: item.authored_by_user
                  ? colors.secondaryContainer
                  : colors.elevation.level1,
              }}
              mode="flat">
              {isGroup && !item.authored_by_user && senderName(item) && (
                <Text
                  style={{ color: colors.primary, fontWeight: 'bold' }}
                  variant="labelLarge">
                  {senderName(item)}
                </Text>
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
          )
        }
      />
      <KeyboardStickyView>
        {isGroup && identityName(meta?.user?.identity) && (
          <Text
            variant="labelMedium"
            style={{
              color: colors.onSurfaceVariant,
              paddingHorizontal: 15,
              paddingVertical: 5,
              backgroundColor: colors.background,
            }}>
            {/anonymous/i.test(identityName(meta.user.identity))
              ? '🕶️ '
              : '👤 '}
            You appear as{' '}
            <Text style={{ fontWeight: 'bold', color: colors.onSurface }}>
              {identityName(meta.user.identity)}
            </Text>
          </Text>
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
      </KeyboardStickyView>
    </View>
  );
}

export default ThreadScreen;
