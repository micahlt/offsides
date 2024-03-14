import {
  SidechatCursorString,
  SidechatPostOrComment,
} from 'sidechat.js/src/types';
import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  StatusBar,
  InteractionManager,
} from 'react-native';
import {
  Appbar,
  Text,
  Avatar,
  useTheme,
  Menu,
  ProgressBar,
  TouchableRipple,
} from 'react-native-paper';
import { AppContext } from '../App';
import { useFocusEffect } from '@react-navigation/native';
import Post from '../components/Post';
import GroupPicker from '../components/GroupPicker';

const BORDER_RADIUS = 12;

function HomeScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [postCategory, setPostCategory] = React.useState('hot');

  const [cursor, setCursor] = React.useState(
    /** @type {SidechatCursorString} */ (null),
  );
  const { colors } = useTheme();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [loadingPosts, setLoadingPosts] = React.useState(false);
  const [renderedPostIds, setRenderedPostIds] = React.useState(new Set());
  const [currentGroupId, setCurrentGroupId] = React.useState(appState.groupID);
  const [posts, setPosts] = React.useState(
    /** @type {SidechatPostOrComment[]} */ ([]),
  );
  const [groupPickerShown, setGroupPickerShown] = React.useState(false);
  useFocusEffect(() => {
    if (appState.groupID != currentGroupId) {
      setCurrentGroupId(appState.groupID);
    }
  });
  React.useEffect(() => {
    if (!loadingPosts) {
      InteractionManager.runAfterInteractions(() => {
        if (appState.groupID && appState.userToken) {
          setCurrentGroupId(currentGroupId);
          setLoadingPosts(true);
          fetchPosts(true);
        } else {
          console.log('App state is undefined, will load in a second');
        }
      });
    }
  }, [postCategory, currentGroupId]);
  React.useEffect(() => {
    const newRenderedPostIds = new Set(renderedPostIds);
    posts.forEach(post => newRenderedPostIds.add(post.id));
    setRenderedPostIds(newRenderedPostIds);
  }, [posts]);
  const renderItem = React.useCallback(each => {
    // Check if the post has already been rendered
    if (renderedPostIds.has(each.id)) {
      return null; // Skip rendering if the post is a duplicate
    }
    return <Post post={each.item} nav={navigation} key={each.id} />;
  });
  const fetchPosts = refresh => {
    if (loadingPosts) return false;
    setLoadingPosts(true);
    if (refresh) {
      setPosts([]);
      API.getGroupPosts(appState.groupID, postCategory).then(res => {
        if (res.posts) {
          setPosts(res.posts.filter(i => i.id));
          setCursor(res.cursor);
        }
        setLoadingPosts(false);
      });
    } else {
      API.getGroupPosts(appState.groupID, postCategory, cursor).then(res => {
        if (res.posts) {
          setPosts(posts.concat(res.posts.filter(i => i.id)));
          setCursor(res.cursor);
        }
        setLoadingPosts(false);
      });
    }
  };
  return (
    <>
      <StatusBar animated={true} backgroundColor={colors.background} />
      <GroupPicker
        visible={groupPickerShown}
        hide={() => setGroupPickerShown(false)}
      />
      {appState.groupName && (
        <Appbar.Header style={{ zIndex: 1 }}>
          <Appbar.Content
            title={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableRipple
                  onPress={() => setGroupPickerShown(true)}
                  style={{ borderRadius: BORDER_RADIUS, marginRight: 15 }}
                  borderless={true}>
                  {appState.groupImage ? (
                    <Image
                      style={{
                        height: 45,
                        width: 45,
                        borderRadius: BORDER_RADIUS,
                      }}
                      source={{ uri: appState.groupImage }}
                    />
                  ) : (
                    <Avatar.Text
                      size={45}
                      label={
                        appState.groupName.length < 3
                          ? appState.groupName
                          : appState.groupName.substring(0, 2)
                      }
                      style={{
                        borderRadius: BORDER_RADIUS,
                        backgroundColor:
                          appState.groupColor || colors.primaryContainer,
                      }}
                    />
                  )}
                </TouchableRipple>
                {appState.groupName.length > 2 ? (
                  <Text
                    variant="headlineSmall"
                    numberOfLines={1}
                    style={{ marginRight: 50 }}>
                    {appState.groupName}
                  </Text>
                ) : (
                  <Text variant="headlineSmall">
                    {postCategory[0].toUpperCase() + postCategory.slice(1)}{' '}
                    Posts
                  </Text>
                )}
              </View>
            }
          />

          <Menu
            anchor={
              <Appbar.Action
                icon="filter-variant"
                onPress={() => setFilterOpen(true)}></Appbar.Action>
            }
            visible={filterOpen}
            onDismiss={() => setFilterOpen(false)}>
            <Menu.Item
              title="Hot"
              leadingIcon={postCategory == 'hot' ? 'check' : 'fire'}
              style={{
                backgroundColor:
                  postCategory == 'hot' ? colors.primaryContainer : null,
              }}
              onPress={() => {
                setPostCategory('hot');
                setFilterOpen(false);
              }}
            />
            <Menu.Item
              title="Top"
              leadingIcon={
                postCategory == 'top' ? 'check' : 'arrow-up-bold-box'
              }
              style={{
                backgroundColor:
                  postCategory == 'top' ? colors.primaryContainer : null,
              }}
              onPress={() => {
                setPostCategory('top');
                setFilterOpen(false);
              }}
            />
            <Menu.Item
              title="New"
              leadingIcon={postCategory == 'recent' ? 'check' : 'new-box'}
              style={{
                backgroundColor:
                  postCategory == 'recent' ? colors.primaryContainer : null,
              }}
              onPress={() => {
                setPostCategory('recent');
                setFilterOpen(false);
              }}
            />
          </Menu>
          <Appbar.Action
            icon="account"
            onPress={() => navigation.push('MyProfile')}></Appbar.Action>
        </Appbar.Header>
      )}
      <View style={{ ...style.container, backgroundColor: colors.background }}>
        <ProgressBar indeterminate={true} visible={loadingPosts} />
        <FlatList
          contentContainerStyle={{ gap: 10, padding: 10 }}
          data={posts}
          renderItem={renderItem}
          estimatedItemSize={350}
          windowSize={10}
          onRefresh={() => fetchPosts(true)}
          refreshing={loadingPosts}
          onEndReachedThreshold={0.5}
          onEndReached={() => fetchPosts(false)}
        />
      </View>
    </>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HomeScreen;
