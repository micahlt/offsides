import {
  SidechatCursorString,
  SidechatPostOrComment,
} from 'sidechat.js/src/types/SidechatTypes.js';
import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  StatusBar,
  InteractionManager,
  useColorScheme,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Appbar,
  Text,
  useTheme,
  Menu,
  Card,
  Button,
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useMMKVObject, useMMKVString } from 'react-native-mmkv';
import { FlashList } from '@shopify/flash-list';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Onboarding from '../components/Onboarding';

const BORDER_RADIUS = 12;

function HomeScreen({ navigation }) {
  const sheetRef = React.useRef(null);
  const [customTheme, setCustomTheme] = React.useState(false);
  const { appState } = React.useContext(AppContext);
  const API = React.useMemo(() => appState.API, [appState.API]);

  const [cursor, setCursor] = React.useState(
    /** @type {SidechatCursorString} */(null),
  );
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const colors = theme.colors;
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [loadingPosts, setLoadingPosts] = React.useState(false);
  const [sheetIsOpen, setSheetIsOpen] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');
  const [userGroups, setUserGroups] = useMMKVObject('userGroups');
  const [postSortMethod, setPostSortMethod] = useMMKVString('postSortMethod');
  const [sortIcon, setSortIcon] = React.useState('filter-variant');
  const [updateBadge, setUpdateBadge] = React.useState(false);
  const [onboard, setOnboard] = React.useState(false);
  const [posts, setPosts] = React.useState(
    /** @type {SidechatPostOrComment[]} */([]),
  );

  React.useEffect(() => {
    crashlytics().log('Loading HomeScreen');
    needsUpdate().then(setUpdateBadge);
    API.getUpdates().then(updates => setUserGroups(updates.groups));
  }, []);

  React.useEffect(() => {
    crashlytics().log('Setting group color');
    if (currentGroup?.color) {
      const t = createMaterial3Theme(currentGroup.color.includes("#") ? currentGroup.color : `#${currentGroup.color}`);
      setCustomTheme(colorScheme == 'dark' ? t.dark : t.light);
    }
  }, [currentGroup]);

  React.useEffect(() => {
    crashlytics().log('Detected group change or sort method change');
    updateSortIcon();
    if (!loadingPosts) {
      InteractionManager.runAfterInteractions(() => {
        if (appState.userToken && currentGroup?.id) {
          fetchPosts(true, currentGroup.id);
          setOnboard(false);
        } else if (appState.userToken && !currentGroup) {
          setOnboard(true);
        } else {
          console.log('App state is undefined, will load in a second');
        }
      });
    }
  }, [postSortMethod, currentGroup]);

  const uniquePosts = useUniqueList(posts);
  const renderItem = React.useCallback(each => {
    return <Post themeColors={customTheme || colors} apiInstance={API} post={each.item} nav={navigation} />;
  }, [customTheme]);
  const updateSortIcon = () => {
    if (!postSortMethod) return;
    crashlytics().log('Setting sort icon');
    switch (postSortMethod) {
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
    if (loadingPosts || !currentGroup?.id || !postSortMethod) return false;
    crashlytics().log(`Fetching posts sorted by ${postSortMethod}`);
    setLoadingPosts(true);
    try {
      if (refresh) {
        crashlytics().log('Fetch triggered by refresh/group change');
        setPosts([]);
        API.getGroupPosts(override || currentGroup.id, postSortMethod).then(
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
          override || currentGroup.id,
          postSortMethod,
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

  const position = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));

  const flingGesture = Gesture.Pan()
    .onStart((e) => {
      if (Math.abs(e.velocityX) > 300) {
        const currentIndex = userGroups.findIndex((g) => g.id == currentGroup.id);
        let nextIndex;
        if (e.velocityX < 0) {
          position.value = withSequence(withTiming(-20, { duration: 100 }), withTiming(0, { duration: 200 }));
          nextIndex = currentIndex + 1;
          if (!userGroups[nextIndex]) {
            nextIndex = 0;
          }
        } else if (e.velocityX > 0) {
          position.value = withSequence(withTiming(20, { duration: 100 }), withTiming(0, { duration: 200 }));
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) {
            nextIndex = userGroups.length - 1;
          }
        }
        runOnJS(setCurrentGroup)(userGroups[nextIndex]);
      }
    });

  const deviceHeight = React.useMemo(() => Dimensions.get("window").height, []);

  return (
    <ThemeProvider
      theme={customTheme ? { ...theme, colors: { ...customTheme } } : theme}>
      <StatusBar
        animated={true}
        backgroundColor={
          customTheme ? customTheme.background : colors.background
        }
      />
      {!!currentGroup && !!postSortMethod && (
        <Appbar.Header style={{ zIndex: 1 }}>
          <Appbar.Content
            title={
              <GestureDetector gesture={flingGesture}>
                <Animated.View style={[{ flexDirection: 'row', alignItems: 'center' }, animatedStyle]}>
                  <GroupAvatar
                    groupColor={currentGroup.color}
                    groupImage={currentGroup?.icon_url || ''}
                    groupName={currentGroup.name}
                    onPress={() => sheetRef.current?.open()}
                    borderRadius={BORDER_RADIUS}
                    style={{ marginRight: 15 }}
                  />
                  {currentGroup.name.length > 2 ? (
                    <TouchableOpacity onPress={() => sheetRef?.current?.open()}>
                      <Text
                        variant="headlineSmall"
                        numberOfLines={1}
                        style={{ marginRight: 50 }}>
                        {currentGroup.name}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text variant="headlineSmall">
                      {postSortMethod[0].toUpperCase() + postSortMethod.slice(1)}{' '}
                      Posts
                    </Text>
                  )}
                </Animated.View>
              </GestureDetector>
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
              leadingIcon={postSortMethod == 'hot' ? 'check' : 'fire'}
              style={{
                backgroundColor:
                  postSortMethod == 'hot'
                    ? customTheme
                      ? customTheme.primaryContainer
                      : colors.primaryContainer
                    : null,
              }}
              onPress={() => {
                setFilterOpen(false);
                setPostSortMethod('hot');
              }}
            />
            {currentGroup.name != 'Home' && (
              <Menu.Item
                title="Top"
                leadingIcon={postSortMethod == 'top' ? 'check' : 'medal'}
                style={{
                  backgroundColor:
                    postSortMethod == 'top' ? customTheme
                      ? customTheme.primaryContainer
                      : colors.primaryContainer : null,
                }}
                onPress={() => {
                  setFilterOpen(false);
                  setPostSortMethod('top');
                }}
              />
            )}
            <Menu.Item
              title="Recent"
              leadingIcon={postSortMethod == 'recent' ? 'check' : 'clock'}
              style={{
                backgroundColor:
                  postSortMethod == 'recent' ? customTheme
                    ? customTheme.primaryContainer
                    : colors.primaryContainer : null,
              }}
              onPress={() => {
                setFilterOpen(false);
                setPostSortMethod('recent');
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
      {onboard && (
        <Onboarding />
      )}
      <View
        style={{
          ...style.container,
          backgroundColor: customTheme
            ? customTheme.background
            : colors.background,
        }}>
        <ProgressBar indeterminate={true} visible={loadingPosts} />
        {currentGroup?.name == 'Home' && postSortMethod == 'top' ? (
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
          <FlashList
            contentContainerStyle={{ rowGap: 10, marginHorizontal: 10, marginTop: -10 }}
            ItemSeparatorComponent={() => <View style={{ marginBottom: 10 }}></View>}
            data={uniquePosts}
            renderItem={renderItem}
            onRefresh={() => fetchPosts(true)}
            refreshing={loadingPosts}
            onEndReachedThreshold={0.5}
            keyExtractor={item => item._id}
            onEndReached={() => fetchPosts(false)}
            ListHeaderComponent={updateBadge ? <Card style={{ width: '100%' }} mode="contained">
              <Card.Title
                title="Update available"
                titleVariant="titleMedium"
                titleStyle={{ color: customTheme?.primary || colors.primary, minHeight: 20, marginLeft: -20 }}
                subtitleStyle={{ color: customTheme?.secondary || colors.secondary, marginTop: 0 }}
                left={() => <Icon source="cellphone-arrow-down" size={24} color={customTheme?.primary || colors.primary} />}
                right={() => <Button
                  mode="elevated"
                  onPress={() => {
                    navigation.push('Settings');
                  }} style={{ marginRight: 20 }}>
                  Download
                </Button>}
              />
            </Card> : <></>}
            windowSize={10}
          />
        )}
        {currentGroup?.name && <FAB
          icon="plus"
          label="Post"
          style={{ position: 'absolute', bottom: 20, right: 20 }}
          onPress={() =>
            navigation.push('Writer', {
              mode: 'post',
              groupID:
                currentGroup?.name == 'Home'
                  ? appState.schoolGroupID
                  : currentGroup.id,
            })
          }
        />}
      </View>
      <View>
        <BottomSheet
          ref={sheetRef}
          backdropMaskColor={colors.backdrop}
          dragHandleStyle={{ backgroundColor: colors.outline, marginBottom: 0 }}
          openDuration={550}
          closeDuration={250}
          height={deviceHeight - 225}
          style={{
            backgroundColor: colors.surface,
            zIndex: 10000
          }}
          animationType="slide"
          onClose={() => setSheetIsOpen(false)}
          onOpen={() => setSheetIsOpen(true)}
          disableBodyPanning={true}>
          {sheetIsOpen && <GroupPicker sheetRef={sheetRef} />}
        </BottomSheet>
      </View>
    </ThemeProvider>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HomeScreen;
