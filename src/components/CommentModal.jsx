import React, { useEffect } from 'react';
import {
  View,
  StatusBar,
  StyleSheet,
  FlatList,
  InteractionManager,
} from 'react-native';
import { Appbar, useTheme, Text, FAB, Divider } from 'react-native-paper';
import { AppContext } from '../App';
import Comment from './Comment';
import Post from './Post';
import useUniqueList from '../hooks/useUniqueList';

function CommentModal({ navigation, route }) {
  /** @type {{postID: String, postObj: SidechatPostOrComment}} */
  const { postID, postObj } = route.params;
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [comments, setComments] = React.useState(
    /** @type {SidechatPostOrComment[]} */ ([]),
  );
  const [loadingComments, setLoadingComments] = React.useState(true);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      fetchComments(true);
    });
  }, []);
  const renderItem = React.useCallback(
    each => <Comment comment={each.item} nav={navigation} />,
    [],
  );
  const fetchComments = () => {
    setLoadingComments(true);
    API.getPostComments(postID).then(res => {
      setComments(res);
      setLoadingComments(false);
    });
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
          contentContainerStyle={{ gap: 10, padding: 10, paddingBottom: 90 }}
          data={uniqueComments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          estimatedItemSize={200}
          windowSize={10}
          onRefresh={fetchComments}
          refreshing={loadingComments}
          ListHeaderComponent={
            <>
              <Post post={postObj} commentView={true} />
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
          style={{ position: 'absolute', bottom: 20, right: 20 }}
          onPress={() =>
            navigation.navigate('Writer', {
              mode: 'comment',
              postID: postID,
              groupID: postObj.group.id,
            })
          }
        />
      </View>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CommentModal;
