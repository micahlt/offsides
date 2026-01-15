import React from 'react';
import { FlatList, InteractionManager, View } from 'react-native';
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
      const d = await API.getDMThread(chatID);
      setMessages(d.messages);
      setMeta(d);
      setManualRefreshing(false);
      setIsFetching(false);
    }
  };

  const sendMessage = async () => {
    const id = await DeviceInfo.getAndroidId();
    const deviceID = sha256(id);
    setMessageDraft('');
    await API.sendDM(chatID, messageDraft, deviceID);
    await fetchMessages(false);
  };

  const startThread = async () => {
    const id = await DeviceInfo.getAndroidId();
    const deviceID = sha256(id);
    setMessageDraft('');
    const newDM = await API.startDM(messageDraft, deviceID, postID);
    navigation.setParams({ chatID: newDM.chat.id });
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
          flexDirection: 'column-reverse',
        }}
        data={messages}
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
        onSubmitEditing={() => {
          if (chatID) {
            sendMessage();
          } else {
            startThread();
          }
        }}
        autoFocus={true}
        placeholder="Send a message"
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
    </View>
  );
}

export default ThreadScreen;
