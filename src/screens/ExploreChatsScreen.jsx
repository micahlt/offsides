import React from 'react';
import { FlatList, View } from 'react-native';
import {
  Appbar,
  Avatar,
  Button,
  Chip,
  Dialog,
  Icon,
  Portal,
  ProgressBar,
  Snackbar,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { AppContext } from '../App';

function ExploreChatsScreen({ navigation, route }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const joinedIDs = route.params?.joinedIDs || [];
  const [chats, setChats] = React.useState([]);
  const [icon, setIcon] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [displayName, setDisplayName] = React.useState('');
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    setLoading(true);
    try {
      // The icon only matters for joining, so its failure shouldn't hide the list.
      const [explore, updates] = await Promise.allSettled([
        API.getGroupChats(),
        API.getUpdates(),
      ]);
      // Joining reuses the emoji and colors from your profile icon.
      if (updates.status == 'fulfilled' && updates.value?.user) {
        setIcon(updates.value.user.conversation_icon || null);
      }
      // An API error comes back as a body without chats, not a throw.
      if (explore.status != 'fulfilled' || !Array.isArray(explore.value)) {
        throw explore.reason || new Error('Unexpected explore response');
      }
      setChats(explore.value.map(o => o.chat || o));
    } catch (e) {
      setError("Sorry, group chats couldn't be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const joinChat = async () => {
    setJoining(true);
    try {
      await API.joinGroupChat(
        selected.id,
        displayName.trim(),
        icon.emoji,
        icon.color,
        icon.secondary_color,
      );
      setSelected(null);
      navigation.goBack();
    } catch (e) {
      setSelected(null);
      setError("Sorry, you couldn't join that chat.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Find Group Chats" />
      </Appbar.Header>
      {loading && <ProgressBar indeterminate={true} visible={true} />}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, gap: 10 }}
        data={chats}
        keyExtractor={item => item.id}
        onRefresh={loadChats}
        refreshing={false}
        renderItem={({ item }) => {
          const joined = joinedIDs.includes(item.id);
          return (
            <TouchableRipple
              borderless={true}
              disabled={joined}
              onPress={() => setSelected(item)}
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
                {item.icon_url ? (
                  <Avatar.Image size={40} source={{ uri: item.icon_url }} />
                ) : (
                  <Icon
                    source="account-group-outline"
                    size={32}
                    color={colors.primary}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface }} variant="bodyLarge">
                    {item.name}
                  </Text>
                  <Text
                    style={{ color: colors.onSurfaceVariant }}
                    variant="labelMedium">
                    {item.member_count} members
                  </Text>
                </View>
                {joined && <Chip compact={true}>Joined</Chip>}
              </Surface>
            </TouchableRipple>
          );
        }}
      />
      {/* Portal renders above the navigator, so nothing in here may use navigation hooks. */}
      <Portal>
        <Dialog
          visible={!!selected}
          onDismiss={() => !joining && setSelected(null)}>
          <Dialog.Title>Join {selected?.name}?</Dialog.Title>
          <Dialog.Content style={{ gap: 15 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              <Avatar.Text
                size={45}
                label={String(icon?.emoji || '?')}
                color="white"
                style={{
                  backgroundColor: icon?.color || colors.primary,
                  borderRadius: 12,
                }}
              />
              <TextInput
                mode="outlined"
                label="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                style={{ flex: 1 }}
              />
            </View>
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant }}>
              You'll appear with your profile emoji and this name. Offsides
              can't leave group chats yet, so you won't be able to leave this
              one from the app.
            </Text>
            {!icon && (
              <Text variant="bodyMedium" style={{ color: colors.error }}>
                Joining needs your profile emoji. Set one in Edit Profile, or
                pull down to reload.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)} disabled={joining}>
              Cancel
            </Button>
            <Button
              onPress={joinChat}
              loading={joining}
              disabled={joining || !displayName.trim() || !icon}>
              Join
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={!!error} onDismiss={() => setError('')}>
        {error}
      </Snackbar>
    </View>
  );
}

export default ExploreChatsScreen;
