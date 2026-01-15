import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import {
  Card,
  Text,
  IconButton,
  useTheme,
  SegmentedButtons,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import crashlytics from '@react-native-firebase/crashlytics';
import ActivityItem from '../components/ActivityItem';
import Post from './Post';
import Comment from './Comment';
import { AppContext } from '../App';
import { getUserContentPaginated } from '../utils/enhancedAPI';

function EnhancedUserContent({ updates }) {
  useEffect(() => {
    crashlytics().log('Loading EnhancedUserContent');
  }, []);

  const [view, setView] = React.useState('activity');
  const [postsData, setPostsData] = useState({ posts: [], cursor: null, hasMore: false, loading: false });
  const [commentsData, setCommentsData] = useState({ posts: [], cursor: null, hasMore: false, loading: false });
  const API = React.useContext(AppContext).appState.API;

  // Load initial data when view changes
  useEffect(() => {
    if (view === 'posts' && postsData.posts.length === 0) {
      loadInitialPosts();
    } else if (view === 'comments' && commentsData.posts.length === 0) {
      loadInitialComments();
    }
  }, [view]);

  const loadInitialPosts = async () => {
    setPostsData(prev => ({ ...prev, loading: true }));
    try {
      const data = await getUserContentPaginated(API, 'posts');
      setPostsData({
        posts: data.posts,
        cursor: data.cursor,
        hasMore: data.hasMore,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading posts:', error);
      setPostsData(prev => ({ ...prev, loading: false }));
    }
  };

  const loadInitialComments = async () => {
    setCommentsData(prev => ({ ...prev, loading: true }));
    try {
      const data = await getUserContentPaginated(API, 'comments');
      setCommentsData({
        posts: data.posts,
        cursor: data.cursor,
        hasMore: data.hasMore,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading comments:', error);
      setCommentsData(prev => ({ ...prev, loading: false }));
    }
  };

  const loadMorePosts = async () => {
    if (!postsData.cursor || postsData.loading) return;
    
    setPostsData(prev => ({ ...prev, loading: true }));
    try {
      const data = await getUserContentPaginated(API, 'posts', postsData.cursor);
      setPostsData(prev => ({
        posts: [...prev.posts, ...data.posts],
        cursor: data.cursor,
        hasMore: data.hasMore,
        loading: false,
      }));
    } catch (error) {
      console.error('Error loading more posts:', error);
      setPostsData(prev => ({ ...prev, loading: false }));
    }
  };

  const loadMoreComments = async () => {
    if (!commentsData.cursor || commentsData.loading) return;
    
    setCommentsData(prev => ({ ...prev, loading: true }));
    try {
      const data = await getUserContentPaginated(API, 'comments', commentsData.cursor);
      setCommentsData(prev => ({
        posts: [...prev.posts, ...data.posts],
        cursor: data.cursor,
        hasMore: data.hasMore,
        loading: false,
      }));
    } catch (error) {
      console.error('Error loading more comments:', error);
      setCommentsData(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SegmentedButtons
        buttons={[
          {
            value: 'activity',
            label: 'Activity',
            showSelectedCheck: true,
          },
          {
            value: 'posts',
            label: 'Posts',
            showSelectedCheck: true,
          },
          {
            value: 'comments',
            label: 'Comments',
            showSelectedCheck: true,
          },
        ]}
        density="small"
        value={view}
        onValueChange={setView}
      />
      <ItemList
        updates={updates}
        view={view}
        style={{ marginTop: 10, flex: 1 }}
        postsData={postsData}
        commentsData={commentsData}
        loadMorePosts={loadMorePosts}
        loadMoreComments={loadMoreComments}
        API={API}
      />
    </View>
  );
}

const ItemList = ({ 
  updates, 
  view, 
  style, 
  postsData, 
  commentsData, 
  loadMorePosts, 
  loadMoreComments,
  API
}) => {
  const nav = useNavigation();
  const { colors } = useTheme();

  switch (view) {
    case 'activity': {
      return (
        <Card style={style}>
          <Card.Content
            style={{ rowGap: 8, marginTop: -16, marginBottom: -16 }}>
            <FlatList
              showsVerticalScrollIndicator={false}
              data={updates.activity_items?.items?.filter(i => !i.is_seen)}
              contentContainerStyle={{
                gap: 10,
                paddingTop: 15,
                paddingBottom: 15,
              }}
              keyExtractor={item => item.id}
              renderItem={a => (
                <ActivityItem activity={a.item} key={a.item.id} />
              )}
              ListEmptyComponent={
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <IconButton
                    icon="bell-badge"
                    size={64}
                    iconColor={colors.outline}
                  />
                  <Text style={{ marginBottom: 20, color: colors.outline }}>
                    No recent activity
                  </Text>
                </View>
              }
            />
          </Card.Content>
        </Card>
      );
    }
    case 'posts': {
      return (
        <Card style={style}>
          {postsData.posts.length > 0 ? (
            <Card.Content
              style={{ rowGap: 8, marginTop: -16, marginBottom: -16 }}>
              <FlatList
                data={postsData.posts}
                contentContainerStyle={{
                  paddingTop: 15,
                  paddingBottom: 15,
                }}
                renderItem={p => (
                  <Post
                    apiInstance={API}
                    themeColors={colors}
                    post={p.item}
                    nav={nav}
                    key={p.index}
                    repost={true}
                    cardMode="contained"
                  />
                )}
                windowSize={10}
                ListFooterComponent={() => (
                  <View style={{ paddingTop: 10, alignItems: 'center' }}>
                    {postsData.loading && (
                      <ActivityIndicator animating={true} style={{ marginBottom: 10 }} />
                    )}
                    {postsData.hasMore && !postsData.loading && (
                      <Button 
                        mode="outlined" 
                        onPress={loadMorePosts}
                        style={{ marginBottom: 10 }}
                      >
                        Load More Posts ({postsData.posts.length} loaded)
                      </Button>
                    )}
                    {!postsData.hasMore && postsData.posts.length > 0 && (
                      <Text style={{ color: colors.outline, marginBottom: 10 }}>
                        All posts loaded ({postsData.posts.length} total)
                      </Text>
                    )}
                  </View>
                )}
              />
            </Card.Content>
          ) : postsData.loading ? (
            <Card.Content style={{ alignItems: 'center', padding: 40 }}>
              <ActivityIndicator animating={true} />
              <Text style={{ marginTop: 10, color: colors.outline }}>
                Loading posts...
              </Text>
            </Card.Content>
          ) : (
            <Card.Content
              style={{
                alignItems: 'center',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'center',
              }}>
              <IconButton
                icon="note-remove"
                size={64}
                iconColor={colors.outline}
              />
              <Text style={{ marginBottom: 20, color: colors.outline }}>
                No posts yet
              </Text>
            </Card.Content>
          )}
        </Card>
      );
    }
    case 'comments': {
      return (
        <Card style={style}>
          {commentsData.posts.length > 0 ? (
            <Card.Content
              style={{ rowGap: 8, marginTop: -16, marginBottom: -16 }}>
              <FlatList
                data={commentsData.posts.filter(p => p.authored_by_user)}
                contentContainerStyle={{
                  gap: 10,
                  paddingTop: 15,
                  paddingBottom: 15,
                }}
                renderItem={p => (
                  <Comment
                    comment={p.item}
                    nav={nav}
                    isolated={true}
                    key={p.index}
                  />
                )}
                windowSize={10}
                ListFooterComponent={() => (
                  <View style={{ paddingTop: 10, alignItems: 'center' }}>
                    {commentsData.loading && (
                      <ActivityIndicator animating={true} style={{ marginBottom: 10 }} />
                    )}
                    {commentsData.hasMore && !commentsData.loading && (
                      <Button 
                        mode="outlined" 
                        onPress={loadMoreComments}
                        style={{ marginBottom: 10 }}
                      >
                        Load More Comments ({commentsData.posts.length} loaded)
                      </Button>
                    )}
                    {!commentsData.hasMore && commentsData.posts.length > 0 && (
                      <Text style={{ color: colors.outline, marginBottom: 10 }}>
                        All comments loaded ({commentsData.posts.length} total)
                      </Text>
                    )}
                  </View>
                )}
              />
            </Card.Content>
          ) : commentsData.loading ? (
            <Card.Content style={{ alignItems: 'center', padding: 40 }}>
              <ActivityIndicator animating={true} />
              <Text style={{ marginTop: 10, color: colors.outline }}>
                Loading comments...
              </Text>
            </Card.Content>
          ) : (
            <Card.Content
              style={{
                alignItems: 'center',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'center',
              }}>
              <IconButton
                icon="comment-processing-outline"
                size={64}
                iconColor={colors.outline}
              />
              <Text style={{ marginBottom: 20, color: colors.outline }}>
                No comments yet
              </Text>
            </Card.Content>
          )}
        </Card>
      );
    }
  }
};

export default EnhancedUserContent;