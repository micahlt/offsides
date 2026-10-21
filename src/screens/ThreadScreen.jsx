import React, { useCallback } from 'react';
import { FlatList, InteractionManager, ToastAndroid, View } from 'react-native';
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
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';

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
      const newDM = await API.startDM(text, clientID, postID);
      if (!newDM?.chat?.id) {
        throw new Error('No chat returned: ' + JSON.stringify(newDM));
      }
      navigation.setParams({ chatID: newDM.chat.id });
    } catch (err) {
      console.error(err);
      setMessageDraft(text);
      ToastAndroid.show('Could not start chat', ToastAndroid.SHORT);
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

  const leaveChat = async () => {
    return; // Waiting for sidechat.js implementation
  };

  const goToSource = async () => {
    if (!meta) return;
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
        <Appbar.Content title="Thread" />
        <Tooltip title="Show context">
          <Appbar.Action
            icon="note-text-outline"
            onPress={() => goToSource()}
          />
        </Tooltip>
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
        renderItem={({ item }) => (
          <TouchableRipple
            borderless={true}
            onPress={() => { }}
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
        )}
      />
      <KeyboardStickyView>
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
