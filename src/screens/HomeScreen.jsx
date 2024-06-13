import {
  SidechatCursorString,
  SidechatPostOrComment,
} from 'sidechat.js/src/types';
import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  StatusBar,
  InteractionManager,
  useColorScheme,
} from 'react-native';
import {
  Appbar,
  Text,
  useTheme,
  Menu,
  ProgressBar,
  FAB,
  ThemeProvider,
  Icon,
} from 'react-native-paper';
import { AppContext } from '../App';
import Post from '../components/Post';
import GroupPicker from '../components/GroupPicker';
import useUniqueList from '../hooks/useUniqueList';
import GroupAvatar from '../components/GroupAvatar';
import { createMaterial3Theme } from '@pchmn/expo-material3-theme';
import BottomSheet from '@devvie/bottom-sheet';

const BORDER_RADIUS = 12;

function HomeScreen({ navigation, route }) {
  const { params } = route;
  const sheetRef = React.useRef(null);
  const [customTheme, setCustomTheme] = React.useState(false);
  const { appState, setAppState } = React.useContext(AppContext);
  const API = appState.API;
  const [postCategory, setPostCategory] = React.useState(
    appState.postSortMethod ? appState.postSortMethod : 'hot',
  );

  const [cursor, setCursor] = React.useState(
    /** @type {SidechatCursorString} */ (null),
  );
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const colors = theme.colors;
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [loadingPosts, setLoadingPosts] = React.useState(false);
  const [sheetIsOpen, setSheetIsOpen] = React.useState(false);
  const [sortIcon, setSortIcon] = React.useState('filter-variant');
  const [posts, setPosts] = React.useState(
    /** @type {SidechatPostOrComment[]} */ ([]),
  );
  React.useEffect(() => {
    if (appState.groupColor) {
      const t = createMaterial3Theme(appState.groupColor);
      setCustomTheme(colorScheme == 'dark' ? t.dark : t.light);
    }
  }, [appState?.groupColor]);
  React.useEffect(() => {
    updateSortIcon();
    if (!loadingPosts) {
      InteractionManager.runAfterInteractions(() => {
        if (appState.userToken && params.groupID) {
          if (params?.groupID) {
            let tempSortMethod = appState.postSortMethod;
            if (postCategory != appState.postSortMethod) {
              tempSortMethod = postCategory;
            }
            setAppState({
              ...appState,
              postSortMethod: tempSortMethod,
              groupID: params.groupID,
              groupName: params.groupName,
              groupImage: params.groupImage || '',
              groupColor: params.groupColor,
            });
            fetchPosts(true, params.groupID);
          }
        } else {
          console.log('App state is undefined, will load in a second');
        }
      });
    }
  }, [postCategory, params?.groupID, appState.postSortMethod]);
  const uniquePosts = useUniqueList(posts);
  const renderItem = React.useCallback(each => {
    return <Post post={each.item} nav={navigation} />;
  }, []);
  const updateSortIcon = () => {
    if (!postCategory) return;
    switch (postCategory) {
      case 'hot':
        setSortIcon('fire');
        break;
      case 'top':
        setSortIcon('medal');
        break;
      case 'recent':
        setSortIcon('clock');
        break;
      default:
        setSortIcon('filter-variant');
    }
  };
  const fetchPosts = (refresh, override) => {
    if (loadingPosts) return false;
    setLoadingPosts(true);
    if (refresh) {
      setPosts([]);
      API.getGroupPosts(override || params.groupID, postCategory).then(res => {
        if (res.posts) {
          setPosts(res.posts.filter(i => i.id));
          setCursor(res.cursor);
        }
        setLoadingPosts(false);
      });
    } else {
      API.getGroupPosts(override || params.groupID, postCategory, cursor).then(
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
                icon={sortIcon}
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
            {appState.groupName != 'Home' && (
              <Menu.Item
                title="Top"
                leadingIcon={postCategory == 'top' ? 'check' : 'medal'}
                style={{
                  backgroundColor:
                    postCategory == 'top' ? colors.primaryContainer : null,
                }}
                onPress={() => {
                  setPostCategory('top');
                  setFilterOpen(false);
                }}
              />
            )}
            <Menu.Item
              title="Recent"
              leadingIcon={postCategory == 'recent' ? 'check' : 'clock'}
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
        {appState.groupName == 'Home' && appState.postSortMethod == 'top' ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingBottom: 50,
            }}>
            <Icon
              source="medal"
              size={64}
              color={
                customTheme
                  ? customTheme.primaryContainer
                  : colors.primaryContainer
              }
            />
            <Text variant="titleLarge">Can't sort by top</Text>
            <Text
              variant="bodySmall"
              style={{
                textAlign: 'center',
                paddingHorizontal: 40,
                paddingTop: 10,
              }}>
              This feature isn't supported in your Home group - try switching to
              another group or sort by Recent or Hot.
            </Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{ gap: 10, padding: 10, paddingBottom: 90 }}
            data={uniquePosts}
            renderItem={renderItem}
            estimatedItemSize={450}
            onRefresh={() => fetchPosts(true)}
            refreshing={loadingPosts}
            onEndReachedThreshold={0.5}
            onEndReached={() => fetchPosts(false)}
            windowSize={10}
            keyExtractor={item => item.id}
          />
        )}
        <FAB
          icon="plus"
          label="Post"
          style={{ position: 'absolute', bottom: 20, right: 20 }}
          onPress={() =>
            navigation.push('Writer', {
              mode: 'post',
              groupID:
                appState.groupName == 'Home'
                  ? appState.schoolGroupID
                  : params.groupID,
            })
          }
        />
      </View>
      <BottomSheet
        ref={sheetRef}
        backdropMaskColor={colors.backdrop}
        dragHandleStyle={{ backgroundColor: colors.outline }}
        openDuration={550}
        closeDuration={250}
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
