import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Appbar,
  Button,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { AppContext } from '../App';
import { useMMKVString } from 'react-native-mmkv';

function PaginationTestScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [currentGroup] = useMMKVString('currentGroup');
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test, status, data) => {
    setTestResults(prev => [...prev, { test, status, data, timestamp: Date.now() }]);
  };

  const testEndpoint = async (endpoint, params = {}, description) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${endpoint}${queryString ? '?' + queryString : ''}`;
      
      console.log(`Testing: ${url}`);
      
      const response = await fetch(`https://api.sidechat.lol${url}`, {
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
      
      // Extract useful info
      let info = [];
      if (data.user_posts?.posts) info.push(`Posts: ${data.user_posts.posts.length}`);
      if (data.user_comments?.posts) info.push(`Comments: ${data.user_comments.posts.length}`);
      if (data.posts) info.push(`Posts: ${data.posts.length}`);
      if (data.cursor) info.push(`Cursor: ${data.cursor}`);
      if (data.has_more !== undefined) info.push(`Has more: ${data.has_more}`);
      
      addResult(description, 'success', info.join(', ') || 'Success');
      return data;
    } catch (error) {
      addResult(description, 'error', error.message);
      return null;
    }
  };

  const runPaginationTests = async () => {
    setTesting(true);
    setTestResults([]);
    
    const groupId = JSON.parse(currentGroup || '{}')?.id || '';
    
    // Test 1: Baseline calls
    await testEndpoint('/v1/updates', { group_id: groupId }, 'Baseline getUpdates');
    await testEndpoint('/v1/posts', { type: 'my_posts' }, 'Baseline getUserContent (posts)');
    await testEndpoint('/v1/posts', { type: 'my_comments' }, 'Baseline getUserContent (comments)');
    
    // Test 2: Pagination parameters on getUpdates
    await testEndpoint('/v1/updates', { group_id: groupId, cursor: 'test' }, 'getUpdates + cursor');
    await testEndpoint('/v1/updates', { group_id: groupId, offset: 50 }, 'getUpdates + offset');
    await testEndpoint('/v1/updates', { group_id: groupId, limit: 100 }, 'getUpdates + limit');
    await testEndpoint('/v1/updates', { group_id: groupId, per_page: 100 }, 'getUpdates + per_page');
    await testEndpoint('/v1/updates', { group_id: groupId, page: 2 }, 'getUpdates + page');
    
    // Test 3: Pagination parameters on posts endpoint
    await testEndpoint('/v1/posts', { type: 'my_posts', cursor: 'test' }, 'my_posts + cursor');
    await testEndpoint('/v1/posts', { type: 'my_posts', offset: 50 }, 'my_posts + offset');
    await testEndpoint('/v1/posts', { type: 'my_posts', limit: 100 }, 'my_posts + limit');
    await testEndpoint('/v1/posts', { type: 'my_posts', per_page: 100 }, 'my_posts + per_page');
    
    // Test 4: Try the pattern from getGroupPosts (which works)
    await testEndpoint('/v1/posts', { group_id: groupId, type: 'hot' }, 'Group posts (baseline)');
    await testEndpoint('/v1/posts', { group_id: groupId, type: 'hot', cursor: 'test' }, 'Group posts + cursor');
    
    setTesting(false);
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Pagination API Tests" />
      </Appbar.Header>
      
      <View style={{ padding: 16, gap: 16, flex: 1 }}>
        <Card>
          <Card.Content>
            <Text variant="titleMedium">API Pagination Investigation</Text>
            <Text variant="bodyMedium" style={{ marginTop: 8 }}>
              This will test various pagination parameters on Sidechat API endpoints 
              to see if we can access more than ~50 posts/comments.
            </Text>
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          onPress={runPaginationTests}
          disabled={testing}
          icon={testing ? "loading" : "play"}
        >
          {testing ? "Running Tests..." : "Run Pagination Tests"}
        </Button>

        {testing && <ActivityIndicator animating={true} />}

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {testResults.map((result, index) => (
            <Card key={index} style={{ marginBottom: 8 }}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text 
                    variant="labelMedium" 
                    style={{ 
                      color: result.status === 'success' ? colors.primary : colors.error,
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
    </View>
  );
}

export default PaginationTestScreen;