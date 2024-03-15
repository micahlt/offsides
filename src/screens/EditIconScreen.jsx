import React from 'react';
import { View, StatusBar } from 'react-native';
import {
  Appbar,
  useTheme,
  Avatar,
  ProgressBar,
  TouchableRipple,
  Button,
  IconButton,
  Portal,
  Dialog,
  Snackbar,
  Card,
  Text,
  Divider,
} from 'react-native-paper';
import { AppContext } from '../App';
import EmojiPicker from 'rn-emoji-keyboard';

const BORDER_RADIUS = 25;

function EditIconScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [updates, setUpdates] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState('');
  const [color, setColor] = React.useState(null);
  const [userColors, setUserColors] = React.useState({
    primary: null,
    secondary: null,
  });
  const [error, setError] = React.useState(false);
  const [emoji, setEmoji] = React.useState();
  React.useEffect(() => {
    loadCurrent();
  }, []);
  const loadCurrent = async () => {
    const u = await API.getUpdates();
    setUpdates(u);
    setEmoji(String(u.user?.conversation_icon?.emoji) || '‼️');
    if (u.user?.conversation_icon) {
      setUserColors({
        primary: u.user.conversation_icon.color,
        secondary: u.user.conversation_icon.secondary_color,
      });
    }
    setLoading(false);
  };
  const saveColor = item => {
    if (item == 'accent') {
      setUserColors({
        primary: color.toUpperCase(),
        secondary: userColors.secondary,
      });
    } else if (item == 'background') {
      setUserColors({
        primary: userColors.primary,
        secondary: color.toUpperCase(),
      });
    }
    setDialogMode('');
  };
  const saveIcon = async () => {
    const res = await API.setUserIcon(
      appState.userID,
      emoji,
      userColors.primary,
      userColors.secondary,
    );
    if (res.message) {
      setError(true);
      loadCurrent();
    } else {
      navigation.goBack();
    }
  };
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Edit Icon" />
        <Appbar.Action icon="content-save" onPress={saveIcon} />
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={loading} />
      {updates?.user && (
        <View
          style={{
            rowGap: 10,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}>
          <View style={{ alignItems: 'center', rowGap: 10 }}>
            <TouchableRipple
              borderless={false}
              style={{
                borderColor: userColors.primary,
              }}
              onPress={() => setEmojiPickerOpen(true)}>
              {emoji || userColors.primary || userColors.secondary ? (
                <Avatar.Text
                  size={96}
                  label={emoji}
                  color="white"
                  style={{
                    borderColor: userColors.primary,
                    borderWidth: 5,
                    backgroundColor: userColors.secondary || null,
                    borderRadius: BORDER_RADIUS,
                  }}
                />
              ) : (
                <Avatar.Icon
                  size={96}
                  icon="account"
                  style={{ borderRadius: BORDER_RADIUS }}
                />
              )}
            </TouchableRipple>
            <View style={{ flexDirection: 'row', marginTop: 15 }}>
              <IconButton
                mode="contained-tonal"
                icon="emoticon"
                onPress={() => setEmojiPickerOpen(true)}
              />
            </View>
            <Card>
              <Card.Content style={{ alignItems: 'center' }}>
                <Text
                  variant="titleMedium"
                  style={{ color: colors.primary, marginBottom: 5 }}>
                  Coming soon
                </Text>
                <Text>set your icon's color scheme</Text>
              </Card.Content>
            </Card>
          </View>
          <EmojiPicker
            open={emojiPickerOpen}
            onClose={() => setEmojiPickerOpen(false)}
            onEmojiSelected={e => setEmoji(e.emoji)}
            enableSearchBar={true}
            categoryPosition="bottom"
            theme={{
              backdrop: colors.backdrop,
              knob: colors.primary,
              container: colors.surface,
              header: colors.onSurface,
              skinTonesContainer: colors.surfaceVariant,
              category: {
                icon: colors.primary,
                iconActive: colors.surface,
                container: colors.elevation.level2,
                containerActive: colors.primary,
              },
              search: {
                background: colors.elevation.level1,
                text: colors.onSurface,
                placeholder: colors.onSurface,
                icon: colors.primary,
              },
            }}
          />
          <Portal>
            <Dialog visible={dialogMode}>
              <Dialog.Title>Select theme</Dialog.Title>
              <Dialog.Content></Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setDialogMode('')}>Cancel</Button>
                <Button
                  mode="contained-tonal"
                  style={{ paddingHorizontal: 5 }}
                  onPress={() => saveColor(dialogMode)}>
                  Save color
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      )}
      <Snackbar visible={error} onDismiss={() => setError(false)}>
        Sorry, you can't set that as your icon.
      </Snackbar>
    </View>
  );
}

export default EditIconScreen;
