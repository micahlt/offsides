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
  Divider,
} from 'react-native-paper';
import { AppContext } from '../App';
import { getUserContentPaginated, getEnhancedUpdates } from '../utils/enhancedAPI';
import { useMMKVObject } from 'react-native-mmkv';

function EnhancedAPITestScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [postsData, setPostsData] = useState({ posts: [], cursor: null, hasMore: false });
  const [commentsData, setCommentsData] = useState({ posts: [], cursor: null, hasMore: false });
  const [rawResponses, setRawResponses] = useState([]);
  const [currentGroup] = useMMKVObject('currentGroup');

  const addResult = (test, status, data, rawData = null) => {
    setTestResults(prev => [...prev, { test, status, data, timestamp: Date.now() }]);
    if (rawData) {
      setRawResponses(prev => [...prev, { test, rawData, timestamp: Date.now() }]);
    }
  };

  const inspectObjectForCounts = (obj, path = '') => {
    const findings = [];
    
    const searchKeys = [
      'total_count', 'totalCount', 'total_posts', 'total_comments', 
      'post_count', 'comment_count', 'user_stats', 'stats',
      'count', 'total', 'length', 'size', 'num_posts', 'num_comments'
    ];
    
    const traverse = (current, currentPath) => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        Object.keys(current).forEach(key => {
          const fullPath = currentPath ? `${currentPath}.${key}` : key;
          
          if (searchKeys.some(searchKey => key.toLowerCase().includes(searchKey.toLowerCase()))) {
            findings.push(`${fullPath}: ${JSON.stringify(current[key])}`);
          }
          
          if (typeof current[key] === 'object') {
            traverse(current[key], fullPath);
          }
        });
      }
    };
    
    traverse(obj, path);
    return findings;
  };

  const testRawEndpoint = async (endpoint, params = {}, description) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${endpoint}${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(`${API.apiRoot}${url}`, {
        method: 'GET',
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "App-Version": "6.0.0",
          Dnt: 1,
          Authorization: `Bearer ${API.userToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        addResult(description, 'error', `${response.status}: ${errorText}`);
        return null;
      }

      const data = await response.json();
      
      // Look for count-related fields
      const countFindings = inspectObjectForCounts(data, description);
      const topLevelKeys = Object.keys(data);
      
      let summary = `Keys: [${topLevelKeys.join(', ')}]`;
      if (data.posts) summary += ` | Posts: ${data.posts.length}`;
      if (data.user_posts?.posts) summary += ` | User Posts: ${data.user_posts.posts.length}`;
      if (data.user_comments?.posts) summary += ` | User Comments: ${data.user_comments.posts.length}`;
      if (data.cursor) summary += ` | Cursor: YES`;
      if (countFindings.length > 0) summary += ` | Count Fields: ${countFindings.join(', ')}`;
      
      addResult(description, 'success', summary, data);
      return data;
    } catch (error) {
      addResult(description, 'error', error.message);
      return null;
    }
  };

  const testTotalCountsInvestigation = async () => {
    setTesting(true);
    setTestResults([]);
    setRawResponses([]);
    
    const groupId = currentGroup?.id || '';
    
    try {
      // Test baseline endpoints looking for total counts
      addResult('🔍 INVESTIGATION: Looking for total counts in API responses', 'info', 'Starting deep inspection...');
      
      // Test 1: Base getUpdates call
      await testRawEndpoint('/v1/updates', { group_id: groupId }, '📊 Base getUpdates');
      
      // Test 2: User posts endpoint
      await testRawEndpoint('/v1/posts', { type: 'my_posts' }, '📝 My Posts Endpoint');
      
      // Test 3: User comments endpoint  
      await testRawEndpoint('/v1/posts', { type: 'my_comments' }, '💬 My Comments Endpoint');
      
      // Test 4: Try various parameters that might return totals
      await testRawEndpoint('/v1/posts', { type: 'my_posts', include_stats: 'true' }, '📈 Posts + Stats');
      await testRawEndpoint('/v1/posts', { type: 'my_posts', include_totals: 'true' }, '🔢 Posts + Totals');
      await testRawEndpoint('/v1/posts', { type: 'my_posts', summary: 'true' }, '📋 Posts + Summary');
      
      // Test 5: Try user profile/stats endpoints
      await testRawEndpoint('/v1/user/stats', {}, '👤 User Stats');
      await testRawEndpoint('/v1/user/profile', {}, '👤 User Profile');
      await testRawEndpoint('/v1/user/summary', {}, '👤 User Summary');
      
      // Test 6: Check if different limits reveal metadata
      await testRawEndpoint('/v1/posts', { type: 'my_posts', limit: 1 }, '📝 Posts (limit=1)');
      await testRawEndpoint('/v1/posts', { type: 'my_posts', limit: 100 }, '📝 Posts (limit=100)');
      
      // Test 7: Original enhanced API for comparison
      addResult('🔧 Enhanced API Methods', 'running', 'Testing our wrapper methods...');
      const initialPosts = await getUserContentPaginated(API, 'posts');
      setPostsData(initialPosts);
      addResult('📝 Enhanced Posts', 'success', `Found ${initialPosts.posts.length} posts, cursor: ${initialPosts.cursor ? 'YES' : 'NO'}, hasMore: ${initialPosts.hasMore}`);
      
      const initialComments = await getUserContentPaginated(API, 'comments');
      setCommentsData(initialComments);
      addResult('💬 Enhanced Comments', 'success', `Found ${initialComments.posts.length} comments, cursor: ${initialComments.cursor ? 'YES' : 'NO'}, hasMore: ${initialComments.hasMore}`);

    } catch (error) {
      addResult('❌ Error', 'error', error.message);
    }
    
    setTesting(false);
  };

  const testEnhancedAPI = testTotalCountsInvestigation;

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
            <Text variant="titleMedium">🔍 Total Counts Investigation</Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, marginBottom: 8 }}>
              This will deep-inspect API responses to find total post/comment counts for tab labels.
            </Text>
            <Text variant="bodySmall" style={{ color: colors.outline }}>
              Looking for: total_count, post_count, comment_count, stats fields, etc.
            </Text>
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          onPress={testEnhancedAPI}
          disabled={testing}
          style={{ marginBottom: 16 }}
          icon={testing ? "loading" : "magnify"}
        >
          {testing ? "Investigating..." : "🔍 Investigate Total Counts"}
        </Button>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Chip icon="post">Posts Loaded: {postsData.posts.length}</Chip>
          <Chip icon="comment">Comments Loaded: {commentsData.posts.length}</Chip>
          <Chip icon="database">Responses: {rawResponses.length}</Chip>
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
        
        {/* Raw Response Inspector */}
        {rawResponses.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 8 }}>🔬 Raw Response Inspector</Text>
              <Text variant="bodySmall" style={{ color: colors.outline, marginBottom: 8 }}>
                Tap any response to see complete JSON data
              </Text>
              {rawResponses.map((response, index) => (
                <Button 
                  key={index}
                  mode="outlined" 
                  onPress={() => {
                    console.log(`=== ${response.test} ===`);
                    console.log(JSON.stringify(response.rawData, null, 2));
                    addResult('📋 Console Log', 'info', `Logged ${response.test} data to console`);
                  }}
                  style={{ marginBottom: 4 }}
                  compact
                >
                  📋 {response.test}
                </Button>
              ))}
            </Card.Content>
          </Card>
        )}
        
        <Divider style={{ marginBottom: 16 }} />

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