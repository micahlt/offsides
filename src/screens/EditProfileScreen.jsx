import React from 'react';
import { View, StatusBar, ScrollView } from 'react-native';
import {
  Appbar,
  useTheme,
  Avatar,
  ProgressBar,
  TouchableRipple,
  IconButton,
  Snackbar,
  TextInput,
  Text,
} from 'react-native-paper';
import { AppContext } from '../App';
import EmojiPicker from 'rn-emoji-keyboard';
import BottomSheet from '@devvie/bottom-sheet';
import { SidechatColorList } from 'sidechat.js';
import ThemeCard from '../components/ThemeCard';

const BORDER_RADIUS = 25;

function EditProfileScreen({ navigation }) {
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
  const [username, setUsername] = React.useState('');
  const [usernameError, setUsernameError] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [emoji, setEmoji] = React.useState();
  const [sheetIsOpen, setSheetIsOpen] = React.useState(false);
  const paletteSheetRef = React.useRef(null);
  React.useEffect(() => {
    loadCurrent();
  }, []);
  React.useEffect(() => {
    if (username) {
      API.checkUsername(username).then(res => {
        if (!res) {
          setUsernameError(true);
        } else {
          setUsernameError(false);
        }
      });
    }
  }, [username]);
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
    if (u.user?.username) {
      setUsername(u.user.username);
    }
    setLoading(false);
  };
  const saveIcon = async () => {
    const uname = await API.setUsername(appState.userID, username);
    await uname;
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
        <Appbar.Content title="Edit Profile" />
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
            <TextInput
              label="username"
              mode="outlined"
              style={{ width: '100%', marginBottom: 20, minWidth: 200 }}
              value={username}
              onChangeText={setUsername}
              error={usernameError}
            />
            <TouchableRipple
              borderless={true}
              style={{
                borderColor: userColors.secondary,
                borderRadius: BORDER_RADIUS,
              }}
              onPress={() => setEmojiPickerOpen(true)}>
              {emoji || userColors.primary || userColors.secondary ? (
                <Avatar.Text
                  size={96}
                  label={emoji}
                  color="white"
                  style={{
                    borderColor: userColors.secondary,
                    borderWidth: 5,
                    backgroundColor: userColors.primary || null,
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
              <IconButton
                mode="contained-tonal"
                icon="palette"
                onPress={() => paletteSheetRef?.current?.open()}
              />
            </View>
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
          <BottomSheet
            ref={paletteSheetRef}
            backdropMaskColor={colors.backdrop}
            dragHandleStyle={{
              backgroundColor: colors.primary,
              opacity: 1,
              top: 0,
              height: 5,
              width: 50,
            }}
            openDuration={900}
            closeDuration={500}
            height={240}
            style={{
              backgroundColor: colors.surface,
            }}
            animationType="spring"
            onClose={() => setSheetIsOpen(false)}
            onOpen={() => setSheetIsOpen(true)}>
            <Text variant="headlineMedium" style={{ paddingLeft: 15 }}>
              Choose a theme
            </Text>
            <ScrollView horizontal={true} style={{ gap: 10, padding: 15 }}>
              {SidechatColorList.colors.map((theme, i) => (
                <ThemeCard
                  colors={theme}
                  key={i}
                  onPress={() => {
                    setUserColors(theme);
                    paletteSheetRef?.current?.close();
                  }}
                  selected={
                    userColors.primary == theme.primary &&
                    userColors.secondary == theme.secondary
                  }
                  style={{ marginRight: 10 }}
                />
              ))}
            </ScrollView>
          </BottomSheet>
        </View>
      )}
      <Snackbar visible={error} onDismiss={() => setError(false)}>
        Sorry, you can't set that as your icon.
      </Snackbar>
    </View>
  );
}

export default EditProfileScreen;
