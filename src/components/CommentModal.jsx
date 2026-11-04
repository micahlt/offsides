import React from 'react';
import {
  View,
  StatusBar,
  StyleSheet,
  FlatList,
  InteractionManager,
} from 'react-native';
import {
  Appbar,
  useTheme,
  Text,
  FAB,
  Divider,
  Snackbar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../App';
import Comment from './Comment';
import Post from './Post';
import useUniqueList from '../hooks/useUniqueList';
import { useIsFocused } from '@react-navigation/native';

function CommentModal({ navigation, route }) {
  /** @type {{postID: String, postObj: SidechatPostOrComment}} */
  const { postID, postObj } = route.params;
  const isFocused = useIsFocused();
  const [localPost, setLocalPost] = React.useState(postObj);
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = React.useState(
    /** @type {SidechatPostOrComment[]} */([]),
  );
  const [loadingComments, setLoadingComments] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        fetchComments(true);
      });
    }
  }, [isFocused]);
  const renderItem = React.useCallback(
    each => <Comment comment={each.item} nav={navigation} />,
    [],
  );
  const fetchComments = async () => {
    setLoadingComments(true);
    if (!localPost && postID) {
      API.getPost(postID)
        .then(post => {
          if (post) setLocalPost(post);
          else setError('This post is no longer available.');
        })
        .catch(() => setError("Sorry, this post couldn't be loaded."));
    }
    try {
      setComments(await API.getPostComments(postID));
    } catch (e) {
      setError("Sorry, the comments couldn't be loaded.");
    } finally {
      setLoadingComments(false);
    }
  };

  const uniqueComments = useUniqueList(comments);

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Comments" />
      </Appbar.Header>
      <View style={{ ...style.container, backgroundColor: colors.background }}>
        <FlatList
          contentContainerStyle={{ gap: 10, padding: 10, paddingBottom: 90 + insets.bottom }}
          data={uniqueComments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          estimatedItemSize={200}
          windowSize={10}
          onRefresh={fetchComments}
          refreshing={loadingComments}
          ListHeaderComponent={
            <>
              <Post themeColors={colors} apiInstance={API} post={localPost} commentView={true} nav={navigation} />
              <Divider
                style={{ width: '100%', marginTop: 20, marginBottom: 10 }}
                bold={true}
              />
            </>
          }
          ListEmptyComponent={
            <Text
              style={{ textAlign: 'center', color: colors.onSurfaceDisabled }}>
              No comments yet.
            </Text>
          }
        />
        <FAB
          icon="comment-outline"
          label="Comment"
          style={{ position: 'absolute', bottom: 20 + insets.bottom, right: 20 }}
          // The post may still be loading when opened from activity or a profile.
          disabled={!localPost}
          onPress={() =>
            navigation.push('Writer', {
              mode: 'comment',
              postID: postID,
              groupID: localPost?.group_id ?? localPost?.group?.id,
            })
          }
        />
      </View>
      <Snackbar visible={!!error} onDismiss={() => setError('')}>
        {error}
      </Snackbar>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CommentModal;
