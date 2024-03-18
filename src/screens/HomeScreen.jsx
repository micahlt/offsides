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
  useColorScheme,
} from 'react-native';
import {
  Appbar,
  Text,
  Avatar,
  useTheme,
  Menu,
  ProgressBar,
  TouchableRipple,
  FAB,
  ThemeProvider,
} from 'react-native-paper';
import { AppContext } from '../App';
import { useFocusEffect } from '@react-navigation/native';
import Post from '../components/Post';
import GroupPicker from '../components/GroupPicker';
import useUniqueList from '../hooks/useUniqueList';
import GroupAvatar from '../components/GroupAvatar';
import { createMaterial3Theme } from '@pchmn/expo-material3-theme';
import BottomSheet, { BottomSheetMethods } from '@devvie/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BORDER_RADIUS = 12;

function HomeScreen({ navigation, route }) {
  const { params } = route;
  const sheetRef = React.useRef(null);
  const [customTheme, setCustomTheme] = React.useState(false);
  const { appState, setAppState } = React.useContext(AppContext);
  const API = appState.API;
  const [postCategory, setPostCategory] = React.useState('hot');

  const [cursor, setCursor] = React.useState(
    /** @type {SidechatCursorString} */ (null),
  );
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const colors = theme.colors;
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [loadingPosts, setLoadingPosts] = React.useState(false);
  const [currentGroupId, setCurrentGroupId] = React.useState(
    params?.groupID || appState.groupID,
  );
  const [sheetIsOpen, setSheetIsOpen] = React.useState(false);
  const [posts, setPosts] = React.useState(
    /** @type {SidechatPostOrComment[]} */ ([]),
  );
  useFocusEffect(() => {
    if (appState.groupID != currentGroupId) {
      setCurrentGroupId(appState.groupID);
    }
  });
  React.useEffect(() => {
    if (!loadingPosts) {
      InteractionManager.runAfterInteractions(() => {
        if (appState.groupColor) {
          const t = createMaterial3Theme(appState.groupColor);
          setCustomTheme(colorScheme == 'dark' ? t.dark : t.light);
        }
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
    if (params?.groupID) {
      setAppState({
        ...appState,
        groupID: params.groupID,
        groupName: params.groupName,
        groupImage: params.groupImage || '',
        groupColor: params.groupColor,
      });
      fetchPosts(true, params.groupID);
    }
  }, [params]);
  const uniquePosts = useUniqueList(posts);
  const renderItem = React.useCallback(each => {
    return <Post post={each.item} nav={navigation} key={each.id} />;
  });
  const fetchPosts = (refresh, override) => {
    if (loadingPosts) return false;
    setLoadingPosts(true);
    if (refresh) {
      setPosts([]);
      API.getGroupPosts(override || currentGroupId, postCategory).then(res => {
        if (res.posts) {
          setPosts(res.posts.filter(i => i.id));
          setCursor(res.cursor);
        }
        setLoadingPosts(false);
      });
    } else {
      API.getGroupPosts(override || currentGroupId, postCategory, cursor).then(
        res => {
          if (res.posts) {
            setPosts(posts.concat(res.posts.filter(i => i.id)));
            setCursor(res.cursor);
          }
          setLoadingPosts(false);
        },
      );
    }
  };
  return (
    <ThemeProvider
      theme={customTheme ? { ...theme, colors: { ...customTheme } } : theme}>
      <StatusBar
        animated={true}
        backgroundColor={
          customTheme ? customTheme.background : colors.background
        }
      />
      {appState.groupName && (
        <Appbar.Header style={{ zIndex: 1 }}>
          <Appbar.Content
            title={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GroupAvatar
                  groupColor={appState.groupColor}
                  groupImage={appState.groupImage}
                  groupName={appState.groupName}
                  onPress={() => sheetRef.current?.open()}
                  onLongPress={() => sheetRef.current?.open()}
                  borderRadius={BORDER_RADIUS}
                  style={{ marginRight: 15 }}
                />
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
                  postCategory == 'hot'
                    ? customTheme
                      ? customTheme.primaryContainer
                      : colors.primaryContainer
                    : null,
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
      <View
        style={{
          ...style.container,
          backgroundColor: customTheme
            ? customTheme.background
            : colors.background,
        }}>
        <ProgressBar indeterminate={true} visible={loadingPosts} />
        <FlatList
          contentContainerStyle={{ gap: 10, padding: 10 }}
          data={uniquePosts}
          renderItem={renderItem}
          estimatedItemSize={350}
          windowSize={10}
          onRefresh={() => fetchPosts(true)}
          refreshing={loadingPosts}
          onEndReachedThreshold={0.5}
          onEndReached={() => fetchPosts(false)}
        />
        <FAB
          icon="plus"
          label="Post"
          style={{ position: 'absolute', bottom: 20, right: 20 }}
          onPress={() =>
            navigation.navigate('Writer', {
              mode: 'post',
              groupID: currentGroupId,
            })
          }
        />
      </View>
      <BottomSheet
        ref={sheetRef}
        backdropMaskColor={colors.backdrop}
        dragHandleStyle={{ backgroundColor: colors.outline }}
        openDuration={250}
        closeDuration={200}
        height="80%"
        style={{
          backgroundColor: colors.surface,
        }}
        animationType="slide"
        onClose={() => setSheetIsOpen(false)}
        onOpen={() => setSheetIsOpen(true)}>
        {sheetIsOpen && <GroupPicker sheetRef={sheetRef} />}
      </BottomSheet>
    </ThemeProvider>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HomeScreen;
