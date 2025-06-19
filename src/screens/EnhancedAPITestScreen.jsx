import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  Appbar,
  Button,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { AppContext } from '../App';
import { getUserContentPaginated, getEnhancedUpdates } from '../utils/enhancedAPI';

function EnhancedAPITestScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [postsData, setPostsData] = useState({ posts: [], cursor: null, hasMore: false });
  const [commentsData, setCommentsData] = useState({ posts: [], cursor: null, hasMore: false });

  const addResult = (test, status, data) => {
    setTestResults(prev => [...prev, { test, status, data, timestamp: Date.now() }]);
  };

  const testEnhancedAPI = async () => {
    setTesting(true);
    setTestResults([]);
    
    try {
      // Test 1: Get initial posts
      addResult('Testing getUserContentPaginated (posts)', 'running', 'Fetching first page...');
      const initialPosts = await getUserContentPaginated(API, 'posts');
      setPostsData(initialPosts);
      addResult(
        'Initial Posts', 
        'success', 
        `Found ${initialPosts.posts.length} posts, cursor: ${initialPosts.cursor ? 'YES' : 'NO'}, hasMore: ${initialPosts.hasMore}`
      );

      // Test 2: Get initial comments  
      addResult('Testing getUserContentPaginated (comments)', 'running', 'Fetching first page...');
      const initialComments = await getUserContentPaginated(API, 'comments');
      setCommentsData(initialComments);
      addResult(
        'Initial Comments',
        'success',
        `Found ${initialComments.posts.length} comments, cursor: ${initialComments.cursor ? 'YES' : 'NO'}, hasMore: ${initialComments.hasMore}`
      );

      // Test 3: Test pagination with cursor (if available)
      if (initialPosts.cursor) {
        addResult('Testing posts pagination', 'running', 'Fetching next page...');
        const nextPosts = await getUserContentPaginated(API, 'posts', initialPosts.cursor);
        addResult(
          'Posts Page 2',
          'success',
          `Found ${nextPosts.posts.length} more posts, hasMore: ${nextPosts.hasMore}`
        );
      } else {
        addResult('Posts Pagination', 'info', 'No cursor available - you might not have enough posts');
      }

      if (initialComments.cursor) {
        addResult('Testing comments pagination', 'running', 'Fetching next page...');
        const nextComments = await getUserContentPaginated(API, 'comments', initialComments.cursor);
        addResult(
          'Comments Page 2',
          'success',
          `Found ${nextComments.posts.length} more comments, hasMore: ${nextComments.hasMore}`
        );
      } else {
        addResult('Comments Pagination', 'info', 'No cursor available - you might not have enough comments');
      }

      // Test 4: Test enhanced updates
      addResult('Testing getEnhancedUpdates', 'running', 'Fetching enhanced data...');
      const enhancedData = await getEnhancedUpdates(API);
      addResult(
        'Enhanced Updates',
        'success',
        `Posts: ${enhancedData.user_posts.posts.length}, Comments: ${enhancedData.user_comments.posts.length}`
      );

    } catch (error) {
      addResult('Error', 'error', error.message);
    }
    
    setTesting(false);
  };

  const loadMorePosts = async () => {
    if (!postsData.cursor) return;
    
    try {
      const nextPage = await getUserContentPaginated(API, 'posts', postsData.cursor);
      setPostsData(prev => ({
        posts: [...prev.posts, ...nextPage.posts],
        cursor: nextPage.cursor,
        hasMore: nextPage.hasMore,
      }));
      addResult('Load More Posts', 'success', `Loaded ${nextPage.posts.length} more posts`);
    } catch (error) {
      addResult('Load More Posts', 'error', error.message);
    }
  };

  const loadMoreComments = async () => {
    if (!commentsData.cursor) return;
    
    try {
      const nextPage = await getUserContentPaginated(API, 'comments', commentsData.cursor);
      setCommentsData(prev => ({
        posts: [...prev.posts, ...nextPage.posts],
        cursor: nextPage.cursor,
        hasMore: nextPage.hasMore,
      }));
      addResult('Load More Comments', 'success', `Loaded ${nextPage.posts.length} more comments`);
    } catch (error) {
      addResult('Load More Comments', 'error', error.message);
    }
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Enhanced API Test" />
      </Appbar.Header>
      
      <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium">Enhanced API Methods Test</Text>
            <Text variant="bodyMedium" style={{ marginTop: 8 }}>
              This tests our new paginated API methods that should be able to fetch ALL your posts and comments.
            </Text>
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          onPress={testEnhancedAPI}
          disabled={testing}
          style={{ marginBottom: 16 }}
        >
          {testing ? "Running Tests..." : "Test Enhanced API"}
        </Button>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Chip icon="post">Posts: {postsData.posts.length}</Chip>
          <Chip icon="comment">Comments: {commentsData.posts.length}</Chip>
        </View>

        {/* Load More Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Button 
            mode="outlined" 
            onPress={loadMorePosts}
            disabled={!postsData.cursor || testing}
            style={{ flex: 1 }}
          >
            Load More Posts {postsData.hasMore ? '📄' : '🚫'}
          </Button>
          <Button 
            mode="outlined" 
            onPress={loadMoreComments}
            disabled={!commentsData.cursor || testing}
            style={{ flex: 1 }}
          >
            Load More Comments {commentsData.hasMore ? '💬' : '🚫'}
          </Button>
        </View>

        {testing && <ActivityIndicator animating={true} style={{ marginBottom: 16 }} />}

        {/* Test Results */}
        {testResults.map((result, index) => (
          <Card key={index} style={{ marginBottom: 8 }}>
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text 
                  variant="labelMedium" 
                  style={{ 
                    color: result.status === 'success' ? colors.primary : 
                           result.status === 'error' ? colors.error :
                           result.status === 'running' ? colors.secondary : colors.outline,
                    fontWeight: 'bold'
                  }}
                >
                  {result.status.toUpperCase()}
                </Text>
                <Text variant="titleSmall" style={{ flex: 1 }}>
                  {result.test}
                </Text>
              </View>
              <Text variant="bodySmall" style={{ marginTop: 4, color: colors.onSurfaceVariant }}>
                {result.data}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

export default EnhancedAPITestScreen;