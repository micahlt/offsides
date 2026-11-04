import React from 'react';
import { FlatList, InteractionManager, View } from 'react-native';
import {
  Appbar,
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

function MessageScreen({ navigation }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [dms, setDMs] = React.useState([]);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        fetchDMs(true);
      });
    }
  }, [isFocused]);

  useInterval(() => {
    if (isFocused) {
      fetchDMs(false);
    }
  }, 15000);

  // Group chats come back from the same endpoint; they have their own screen.
  const fetchDMs = async manual => {
    if (manual) {
      setManualRefreshing(true);
    }
    try {
      if (manual) {
        const d = await getChats(API);
        setDMs(d.filter(c => !isGroupChat(c)));
      } else {
        // Polls only need the newest page - new activity always lands there.
        const latest = await getChats(API, 1);
        setDMs(current =>
          mergeChats(current, latest.filter(c => !isGroupChat(c))),
        );
      }
    } catch (e) {
      if (manual) {
        setError(true);
      }
    } finally {
      setManualRefreshing(false);
    }
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Your DMs" />
      </Appbar.Header>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, gap: 10 }}
        data={dms}
        onRefresh={() => fetchDMs(true)}
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
              <Icon
                source="message-reply-text-outline"
                size={32}
                color={colors.primary}
              />
              <View>
                <Text style={{ color: colors.onSurface }} variant="bodyLarge">
                  {item.messages.length > 0
                    ? item.messages[item.messages.length - 1]?.text || ''
                    : 'No messages in this chat'}
                </Text>
                <Text
                  style={{ color: colors.onSurfaceVariant }}
                  variant="labelMedium">
                  {timesago(item.updated_at)}
                </Text>
              </View>
            </Surface>
          </TouchableRipple>
        )}
        ListFooterComponentStyle={{ alignItems: 'center', paddingTop: 30 }}
        ListFooterComponent={() => (
          <Icon
            source="message-processing-outline"
            size={128}
            color={colors.secondaryContainer}
          />
        )}
      />
      <Snackbar visible={error} onDismiss={() => setError(false)}>
        Sorry, your DMs couldn't be loaded.
      </Snackbar>
    </View>
  );
}

export default MessageScreen;
