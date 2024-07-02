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
  Badge,
} from 'react-native-paper';
import crashlytics from '@react-native-firebase/crashlytics';
import { AppContext } from '../App';
import Post from '../components/Post';
import GroupPicker from '../components/GroupPicker';
import useUniqueList from '../hooks/useUniqueList';
import GroupAvatar from '../components/GroupAvatar';
import { createMaterial3Theme } from '@pchmn/expo-material3-theme';
import BottomSheet from '@devvie/bottom-sheet';
import { needsUpdate } from '../utils';

const BORDER_RADIUS = 12;

function HomeScreen({ navigation, route }) {
  const { params } = route;
  const sheetRef = React.useRef(null);
  const [customTheme, setCustomTheme] = React.useState(false);
  const { appState, setAppState } = React.useContext(AppContext);
  const API = appState.API;
  const postCategory = appState.postSortMethod;

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
  const [updateBadge, setUpdateBadge] = React.useState(false);
  const [posts, setPosts] = React.useState(
    /** @type {SidechatPostOrComment[]} */ ([]),
  );
  React.useEffect(() => {
    crashlytics().log('Loading HomeScreen');
    needsUpdate().then(setUpdateBadge);
  }, []);

  React.useEffect(() => {
    crashlytics().log('Setting group color');
    if (appState.groupColor) {
      const t = createMaterial3Theme(appState.groupColor);
      setCustomTheme(colorScheme == 'dark' ? t.dark : t.light);
    }
  }, [appState?.groupColor]);

  React.useEffect(() => {
    crashlytics().log('Detected group change or sort method change');
    updateSortIcon();
    if (!loadingPosts) {
      InteractionManager.runAfterInteractions(() => {
        if (appState.userToken && params.groupID) {
          if (params?.groupID) {
            setAppState({
              ...appState,
              postSortMethod: postCategory,
              groupID: params.groupID,
              groupName: params.groupName,
              groupImage: params.groupImage || '',
              groupColor: params.groupColor,
            });
            fetchPosts(true, params.groupID);
          } else {
            crashlytics().log(
              "No group selected - this shouldn't ever happen!",
            );
          }
        } else {
          console.log('App state is undefined, will load in a second');
        }
      });
    }
  }, [postCategory, params?.groupID]);
  const uniquePosts = useUniqueList(posts);
  const renderItem = React.useCallback(each => {
    return <Post post={each.item} nav={navigation} />;
  }, []);
  const updateSortIcon = () => {
    if (!postCategory) return;
    crashlytics().log('Setting sort icon');
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
    crashlytics().log(`Fetching posts sorted by ${postCategory}`);
    setLoadingPosts(true);
    try {
      if (refresh) {
        crashlytics().log('Fetch triggered by refresh/group change');
        setPosts([]);
        API.getGroupPosts(override || params.groupID, postCategory).then(
          res => {
            if (res.posts) {
              setPosts(res.posts.filter(i => i.id));
              setCursor(res.cursor);
            }
            setLoadingPosts(false);
          },
        );
      } else {
        crashlytics().log('Fetch triggered by scroll at end of list');
        API.getGroupPosts(
          override || params.groupID,
          postCategory,
          cursor,
        ).then(res => {
          if (res.posts) {
            setPosts(posts.concat(res.posts.filter(i => i.id)));
            setCursor(res.cursor);
          }
          setLoadingPosts(false);
        });
      }
    } catch (e) {
      crashlytics().log('Error fetching posts');
      crashlytics().recordError(e);
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
                setFilterOpen(false);
                setAppState({ ...appState, postSortMethod: 'hot' });
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
                  setFilterOpen(false);
                  setAppState({ ...appState, postSortMethod: 'top' });
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
                setFilterOpen(false);
                setAppState({ ...appState, postSortMethod: 'recent' });
              }}
            />
          </Menu>
          <View>
            <Badge
              style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1 }}
              size={8}
              visible={updateBadge}
            />
            <Appbar.Action
              icon="account"
              onPress={() => navigation.push('MyProfile')}></Appbar.Action>
          </View>
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
