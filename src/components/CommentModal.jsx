import React, { useEffect } from 'react';
import {
  View,
  StatusBar,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Appbar, useTheme, Text, Divider } from 'react-native-paper';
import { AppContext } from '../App';
import * as API from '../utils/sidechatAPI';
import Comment from './Comment';
import Post from './Post';

function CommentModal({ navigation, route }) {
  const { postID, postObj } = route.params;
  const appState = React.useContext(AppContext);
  const { colors } = useTheme();
  const [comments, setComments] = React.useState([]);
  const [loadingComments, setLoadingComments] = React.useState(true);

  useEffect(() => {
    fetchComments(true);
  }, []);
  const renderItem = React.useCallback(
    each => <Comment comment={each.item} nav={navigation} />,
    [],
  );
  const fetchComments = refresh => {
    if (refresh) {
      API.getPostComments(postID, appState.userToken).then(res => {
        setComments(res);
        setLoadingComments(false);
      });
    } else {
      API.getPostComments(postID, appState.userToken).then(res => {
        setComments(comments.concat(res));
        setLoadingComments(false);
      });
    }
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Comments" />
      </Appbar.Header>
      <View style={{ ...style.container, backgroundColor: colors.background }}>
        <FlatList
          style={{ padding: 10 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
          data={comments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          estimatedItemSize={200}
          windowSize={10}
          onRefresh={() => fetchComments(true)}
          refreshing={loadingComments}
          ListHeaderComponent={
            <>
              <Post post={postObj} commentView={true} />
              <Divider style={{ width: '100%', marginTop: 10 }} bold={true} />
            </>
          }
          ListEmptyComponent={
            <Text
              style={{ textAlign: 'center', color: colors.onSurfaceDisabled }}>
              No comments yet.
            </Text>
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
