import React from 'react';
import { View, StatusBar, FlatList } from 'react-native';
import {
  Appbar,
  useTheme,
  Text,
  Avatar,
  ProgressBar,
  IconButton,
} from 'react-native-paper';
import crashlytics from '@react-native-firebase/crashlytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../App';
import Post from '../components/Post';

const BORDER_RADIUS = 15;

/**
 * Public profile of another user, looked up by username.
 * Route params: { username: string }
 */
function UserProfileScreen({ navigation, route }) {
  const username = route?.params?.username;
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = React.useState(null);
  const [posts, setPosts] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [unavailable, setUnavailable] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      crashlytics().log(`Loading UserProfileScreen for @${username}`);
      const [p, ps] = await Promise.allSettled([
        API.getUserProfile(username),
        API.getUserPosts(username),
      ]);
      if (cancelled) return;
      if (p.status === 'fulfilled' && p.value && typeof p.value === 'object') {
        setProfile(p.value);
      } else {
        setUnavailable(true);
      }
      if (ps.status === 'fulfilled' && Array.isArray(ps.value)) {
        setPosts(ps.value.filter(i => i?.id));
      } else {
        setPosts([]);
      }
      setLoading(false);
    };
    if (username) {
      load();
    } else {
      setUnavailable(true);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [username]);

  const icon = profile?.conversation_icon;
  const bio =
    typeof profile?.description === 'string' && profile.description.trim()
      ? profile.description.trim()
      : typeof profile?.bio === 'string' && profile.bio.trim()
        ? profile.bio.trim()
        : null;

  const Header = (
    <View style={{ padding: 10, paddingBottom: 0 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {icon?.emoji ? (
          <Avatar.Text
            size={64}
            label={String(icon.emoji)}
            color="white"
            style={{
              backgroundColor: icon.color || colors.primary,
              borderRadius: BORDER_RADIUS,
            }}
          />
        ) : (
          <Avatar.Icon
            size={64}
            icon="account"
            style={{ borderRadius: BORDER_RADIUS }}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge">@{profile?.name || username}</Text>
          {posts && (
            <Text variant="labelLarge" style={{ opacity: 0.7 }}>
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </Text>
          )}
        </View>
      </View>
      {bio && (
        <Text variant="bodyMedium" style={{ marginTop: 10 }}>
          {bio}
        </Text>
      )}
      {unavailable && !profile && (
        <Text variant="bodyMedium" style={{ marginTop: 10, color: colors.outline }}>
          This profile isn't available. The user may have changed their
          username or made their profile private.
        </Text>
      )}
    </View>
  );

  const Empty = !loading ? (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
      <IconButton icon="note-remove" size={64} iconColor={colors.outline} />
      <Text style={{ marginBottom: 20, color: colors.outline }}>
        No public posts
      </Text>
    </View>
  ) : null;

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`@${username || 'profile'}`} />
      </Appbar.Header>
      {loading && <ProgressBar indeterminate={true} visible={true} />}
      <FlatList
        data={posts || []}
        keyExtractor={item => item.id}
        ListHeaderComponent={Header}
        ListEmptyComponent={Empty}
        contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: 10 }}>
            <Post
              apiInstance={API}
              themeColors={colors}
              post={item}
              nav={navigation}
              profileLink={false}
            />
          </View>
        )}
        ListHeaderComponentStyle={{ marginBottom: 10 }}
        windowSize={10}
      />
    </View>
  );
}

export default UserProfileScreen;
