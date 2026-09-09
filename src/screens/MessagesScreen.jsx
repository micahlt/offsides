import React from 'react';
import { FlatList, InteractionManager, ToastAndroid, View } from 'react-native';
import {
  Appbar,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { AppContext } from '../App';
import timesago from 'timesago';
import useInterval from '../hooks/useInterval';

// Message order from the server isn't guaranteed, so pick the newest by date.
function latestText(thread) {
  const msgs = Array.isArray(thread?.messages) ? thread.messages : [];
  if (msgs.length === 0) return 'No messages in this chat';
  const latest = msgs.reduce((best, m) =>
    !best || new Date(m.created_at) > new Date(best.created_at) ? m : best,
  null);
  return latest?.text || '';
}

function MessageScreen({ navigation }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [dms, setDMs] = React.useState([]);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);

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

  const fetchDMs = async manual => {
    if (manual) {
      setManualRefreshing(true);
    }
    try {
      const d = await API.getDMs();
      if (Array.isArray(d)) setDMs(d);
    } catch (e) {
      if (manual) ToastAndroid.show("Couldn't load DMs", ToastAndroid.SHORT);
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
                  {latestText(item)}
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
    </View>
  );
}

export default MessageScreen;
