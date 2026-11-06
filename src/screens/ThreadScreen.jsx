import React from 'react';
import { FlatList, InteractionManager, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Icon,
  ProgressBar,
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
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';

function ThreadScreen({ navigation, route }) {
  const { postID, chatID, title, isGroupChat } = route.params;
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
  const [error, setError] = React.useState('');
  const fetchingRef = React.useRef(false);

  const fetchMessages = React.useCallback(async manual => {
    if (!fetchingRef.current) {
      fetchingRef.current = true;
      setIsFetching(true);
      if (manual) {
        setManualRefreshing(true);
      }
      try {
        const d = await API.getDMThread(chatID);
        setMessages(d?.messages || []);
        setMeta(d);
      } catch (e) {
        setError(e.message || 'Could not load this thread.');
      } finally {
        setManualRefreshing(false);
        setIsFetching(false);
        fetchingRef.current = false;
      }
    }
  }, [API, chatID]);

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        if (chatID) {
          fetchMessages(true);
        }
      });
    }
  }, [chatID, fetchMessages, isFocused]);

  useInterval(() => {
    if (chatID && isFocused) {
      fetchMessages(false);
    }
  }, 5000);

  const sendMessage = async () => {
    const text = messageDraft.trim();
    if (!text) {
      return;
    }
    const id = await DeviceInfo.getAndroidId();
    const deviceID = sha256(id);
    setMessageDraft('');
    try {
      await API.sendDM(chatID, text, deviceID);
      await fetchMessages(false);
    } catch (e) {
      setMessageDraft(text);
      setError(e.message || 'Could not send this message.');
    }
  };

  const startThread = async () => {
    const text = messageDraft.trim();
    if (!text) {
      return;
    }
    const id = await DeviceInfo.getAndroidId();
    const deviceID = sha256(id);
    setMessageDraft('');
    try {
      const newDM = await API.startDM(text, deviceID, postID);
      navigation.setParams({ chatID: newDM.chat.id });
      setMessages(newDM.chat?.messages || []);
      setMeta(newDM.chat);
    } catch (e) {
      setMessageDraft(text);
      setError(e.message || 'Could not start this thread.');
    }
  };

  const goToSource = async () => {
    if (!meta?.post_id) {
      return;
    }
    try {
      const p = await API.getPost(meta.post_id, false);
      if ((await p.type) === 'post') {
        navigation.push('Comments', {
          postID: meta.post_id,
          postObj: p,
        });
      } else if ((await p.type) === 'comment') {
        navigation.push('Comments', {
          postID: p.parent_post_id,
        });
      }
    } catch (e) {
      setError(e.message || 'Could not open the source post.');
    }
  };

  const canSend = messageDraft.trim().length > 0;
  const threadTitle = title || (isGroupChat ? 'Group chat' : 'Thread');

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={threadTitle} />
        {!!meta?.post_id && (
          <Tooltip title="Show context">
            <Appbar.Action
              icon="note-text-outline"
              onPress={() => goToSource()}
            />
          </Tooltip>
        )}
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={isFetching && !manualRefreshing} />
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
        keyExtractor={item => item.id}
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
                borderRadius: 14,
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
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Icon
              source={isGroupChat ? 'account-group-outline' : 'message-outline'}
              size={96}
              color={colors.secondaryContainer}
            />
            <Text variant="titleMedium">
              {chatID ? 'No messages yet' : 'Start the conversation'}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              Messages you send here stay tied to this anonymous thread.
            </Text>
          </View>
        )}
      />
      <KeyboardStickyView>
        <TextInput
          value={messageDraft}
          onChangeText={setMessageDraft}
          mode="outlined"
          dense={true}
          onSubmitEditing={() => {
            if (chatID) {
              sendMessage();
            } else {
              startThread();
            }
          }}
          autoFocus={true}
          placeholder="Send a message"
          style={[
            styles.input,
            {
              marginBottom: insets.bottom + 8,
              backgroundColor: colors.elevation.level1,
            },
          ]}
          outlineStyle={styles.inputOutline}
          right={
            <TextInput.Icon
              icon="send"
              disabled={!canSend}
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
      <Snackbar visible={!!error} onDismiss={() => setError('')}>
        {error}
      </Snackbar>
    </View>
  );
}

export default ThreadScreen;

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 80,
    transform: [{ rotate: '180deg' }],
  },
  emptyText: {
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    marginHorizontal: 10,
    marginTop: 8,
  },
  inputOutline: {
    borderRadius: 18,
  },
});
