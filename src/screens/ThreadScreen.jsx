import React from 'react';
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
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    if (isFocused && chatID) {
      InteractionManager.runAfterInteractions(() => {
        fetchMessages(true);
      });
    }
  }, [isFocused, chatID]);

  useInterval(() => {
    if (chatID && isFocused) {
      fetchMessages(false);
    }
  }, 5000);

  const fetchMessages = async manual => {
    if (isFetching) return;
    setIsFetching(true);
    if (manual) setManualRefreshing(true);
    try {
      const d = await API.getDMThread(chatID);
      if (d && Array.isArray(d.messages)) {
        // Newest first, because the list below is inverted so the latest
        // message sits at the bottom next to the input.
        const ordered = [...d.messages].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        setMessages(ordered);
        setMeta(d);
      }
    } catch (e) {
      if (manual) ToastAndroid.show("Couldn't load messages", ToastAndroid.SHORT);
    } finally {
      setManualRefreshing(false);
      setIsFetching(false);
    }
  };

  // Keep the draft until the server accepts it, so a failed send isn't lost.
  const submit = async () => {
    const text = messageDraft.trim();
    if (!text || isSending) return;
    setIsSending(true);
    try {
      const id = await DeviceInfo.getAndroidId();
      const deviceID = sha256(id);
      if (chatID) {
        const res = await API.sendDM(chatID, text, deviceID);
        if (res?.message) throw new Error(res.message);
        setMessageDraft('');
        await fetchMessages(false);
      } else {
        const newDM = await API.startDM(text, deviceID, postID);
        if (!newDM?.chat?.id) throw new Error(newDM?.message || 'Could not start chat');
        setMessageDraft('');
        // Changing the param triggers the fetch effect above.
        navigation.setParams({ chatID: newDM.chat.id });
      }
    } catch (e) {
      const msg = typeof e?.message === 'string' && e.message.length < 80 ? e.message : '';
      ToastAndroid.show(msg ? `Couldn't send: ${msg}` : "Couldn't send message", ToastAndroid.SHORT);
    } finally {
      setIsSending(false);
    }
  };

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
        }}
        data={messages}
        keyExtractor={item => item.id}
        onRefresh={() => fetchMessages(true)}
        refreshing={manualRefreshing}
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
      <TextInput
        value={messageDraft}
        onChangeText={setMessageDraft}
        onSubmitEditing={submit}
        blurOnSubmit={false}
        editable={!isSending}
        autoFocus={true}
        placeholder="Send a message"
        style={{ paddingBottom: insets.bottom }}
        right={
          <TextInput.Icon
            icon="send"
            disabled={isSending || !messageDraft.trim()}
            onPress={submit}
          />
        }
      />
    </View>
  );
}

export default ThreadScreen;
