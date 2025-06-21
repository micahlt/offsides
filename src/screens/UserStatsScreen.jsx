import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity, AppState } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {
  Appbar,
  Button,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Chip,
  Divider,
  ProgressBar,
  Surface,
} from 'react-native-paper';
import { AppContext } from '../App';
import { getUserContentPaginated } from '../utils/enhancedAPI';
import { useMMKVObject } from 'react-native-mmkv';
import crashlytics from '@react-native-firebase/crashlytics';

const { width } = Dimensions.get('window');

function UserStatsScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  
  // Persistent cache using MMKV
  const [stats, setStats] = useMMKVObject('userStats');
  const [allPosts, setAllPosts] = useMMKVObject('userPosts');
  const [allComments, setAllComments] = useMMKVObject('userComments');
  const [cacheTimestamp, setCacheTimestamp] = useMMKVObject('userStatsTimestamp');
  
  // Background processing state
  const [backgroundProgress, setBackgroundProgress] = useMMKVObject('userStatsBackgroundProgress');
  const [isBackgroundFetching, setIsBackgroundFetching] = useMMKVObject('userStatsBackgroundFetching');
  const appStateRef = useRef(AppState.currentState);
  const backgroundTaskId = useRef(null);

  // Ensure arrays have defaults
  const safeAllPosts = allPosts || [];
  const safeAllComments = allComments || [];

  // Time range filtering - simple presets
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'month', 'week'
  
  // Calculate user's timeline information
  const getTimelineInfo = () => {
    if (!safeAllPosts.length && !safeAllComments.length) {
      return { startDate: null, endDate: null, timelineMonths: [] };
    }
    
    const allContent = [...safeAllPosts, ...safeAllComments].filter(item => item.created_at);
    if (allContent.length === 0) {
      return { startDate: null, endDate: null, timelineMonths: [] };
    }
    
    // Find the actual start and end dates of user activity
    const dates = allContent.map(item => new Date(item.created_at));
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(); // Always end at current time
    
    // Generate month markers for the timeline
    const timelineMonths = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    
    while (current <= end) {
      timelineMonths.push({
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        shortLabel: current.toLocaleDateString('en-US', { month: 'short' }),
        isYearStart: current.getMonth() === 0
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return { startDate, endDate, timelineMonths };
  };
  
  const timelineInfo = getTimelineInfo();
  
  const getFilteredContent = () => {
    const filterByTimeframe = (items) => {
      if (timeFilter === 'all') return items;
      
      const now = new Date();
      let cutoffDate;
      
      if (timeFilter === 'week') {
        cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      } else if (timeFilter === 'month') {
        cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      }
      
      return items.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= cutoffDate;
      });
    };
    
    return {
      posts: filterByTimeframe(safeAllPosts),
      comments: filterByTimeframe(safeAllComments)
    };
  };

  // Cache helper functions
  const isCacheValid = () => {
    if (!cacheTimestamp || !stats) return false;
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return (Date.now() - cacheTimestamp) < oneHour;
  };

  const getCacheAge = () => {
    if (!cacheTimestamp) return '';
    const ageMinutes = Math.floor((Date.now() - cacheTimestamp) / (1000 * 60));
    if (ageMinutes < 1) return 'just now';
    if (ageMinutes < 60) return `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`;
    const ageHours = Math.floor(ageMinutes / 60);
    return `${ageHours} hour${ageHours === 1 ? '' : 's'} ago`;
  };

  const clearCache = () => {
    setStats(null);
    setAllPosts([]);
    setAllComments([]);
    setCacheTimestamp(null);
    setIsBackgroundFetching(false);
    setBackgroundProgress(null);
    setStatus('Cache cleared');
  };

  // Memory monitoring helpers
  const checkMemoryPressure = async (dataSize) => {
    try {
      const totalMemory = await DeviceInfo.getTotalMemory();
      const usedMemory = await DeviceInfo.getUsedMemory();
      const freeMemory = totalMemory - usedMemory;
      const estimatedDataMemory = dataSize * 1000; // Rough estimate
      
      // If we're using more than 80% of available memory, we're in trouble
      const memoryPressure = (usedMemory + estimatedDataMemory) / totalMemory > 0.8;
      
      if (memoryPressure) {
        crashlytics().log(`Memory pressure detected: ${Math.round(usedMemory/1024/1024)}MB used, ${Math.round(freeMemory/1024/1024)}MB free, ${Math.round(totalMemory/1024/1024)}MB total`);
      }
      
      return { memoryPressure, freeMemory, totalMemory, usedMemory };
    } catch (error) {
      console.warn('Could not check memory:', error);
      return { memoryPressure: false };
    }
  };

  // AppState listener for background processing
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appStateRef.current = nextAppState;
      
      if (nextAppState === 'active' && isBackgroundFetching) {
        // User returned while background fetch is running
        if (backgroundProgress) {
          setLoading(true);
          setProgress(backgroundProgress.progress || 0);
          setStatus(backgroundProgress.status || 'Processing in background...');
        }
      }
    });

    return () => subscription?.remove();
  }, [isBackgroundFetching, backgroundProgress]);

  // Check cache and background state on component mount
  useEffect(() => {
    if (stats && isCacheValid()) {
      setStatus(`Loaded cached data from ${getCacheAge()}`);
    } else if (isBackgroundFetching) {
      setLoading(true);
      setStatus('Background processing in progress...');
      if (backgroundProgress) {
        setProgress(backgroundProgress.progress || 0);
      }
    }
  }, []);

  const fetchAllContent = async (forceRefresh = false) => {
    // Check cache first unless forcing refresh
    if (!forceRefresh && isCacheValid()) {
      setStatus(`Using cached data from ${getCacheAge()}`);
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      setIsBackgroundFetching(true);
      setStatus('Starting data collection...');
      setBackgroundProgress({ progress: 0, status: 'Starting data collection...', phase: 'init' });
      crashlytics().log('Starting user stats collection');

      // Fetch all posts
      setStatus('Fetching posts...');
      setBackgroundProgress({ progress: 0.1, status: 'Fetching posts...', phase: 'posts' });
      let allUserPosts = [];
      let cursor = null;
      let pageCount = 0;
      
      do {
        const response = await getUserContentPaginated(API, 'posts', cursor);
        // Use concat instead of spread to avoid memory issues with large arrays
        allUserPosts = allUserPosts.concat(response.posts);
        cursor = response.cursor;
        pageCount++;
        
        const currentProgress = Math.min(0.4, pageCount * 0.02);
        const currentStatus = `Fetched ${allUserPosts.length} posts (page ${pageCount})`;
        
        // Update UI less frequently to reduce render thrashing
        if (pageCount % 5 === 0 || !cursor) {
          setProgress(currentProgress);
          setStatus(currentStatus);
          setBackgroundProgress({ 
            progress: currentProgress, 
            status: currentStatus, 
            phase: 'posts',
            postsCount: allUserPosts.length,
            pageCount 
          });
          
          // Check memory pressure every 10 pages
          if (pageCount % 10 === 0) {
            const memoryStatus = await checkMemoryPressure(allUserPosts.length);
            if (memoryStatus.memoryPressure) {
              setStatus(`Memory pressure detected - stopping at ${allUserPosts.length} posts`);
              break;
            }
          }
        }
        
        // Safety valve
        if (pageCount > 200) {
          setStatus('Stopping at 200 pages - you have a lot of posts!');
          break;
        }
        
        // Dynamic delay based on app state - slower when backgrounded to reduce memory pressure
        const isBackgrounded = appStateRef.current !== 'active';
        const delay = isBackgrounded ? 800 : 200; // Slower when backgrounded
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Additional yield every few pages to prevent UI blocking
        if (pageCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } while (cursor);

      setAllPosts(allUserPosts);
      
      // Fetch all comments
      setStatus('Fetching comments...');
      setBackgroundProgress({ 
        progress: 0.4, 
        status: 'Fetching comments...', 
        phase: 'comments',
        postsCount: allUserPosts.length 
      });
      let allUserComments = [];
      cursor = null;
      pageCount = 0;
      
      do {
        const response = await getUserContentPaginated(API, 'comments', cursor);
        const userComments = response.posts.filter(p => p.authored_by_user);
        // Use concat instead of spread to avoid memory issues with large arrays
        allUserComments = allUserComments.concat(userComments);
        cursor = response.cursor;
        pageCount++;
        
        const currentProgress = Math.min(0.8, 0.4 + (pageCount * 0.02));
        const currentStatus = `Fetched ${allUserComments.length} comments (page ${pageCount})`;
        
        // Update UI less frequently to reduce render thrashing
        if (pageCount % 5 === 0 || !cursor) {
          setProgress(currentProgress);
          setStatus(currentStatus);
          setBackgroundProgress({ 
            progress: currentProgress, 
            status: currentStatus, 
            phase: 'comments',
            postsCount: allUserPosts.length,
            commentsCount: allUserComments.length,
            pageCount 
          });
          
          // Check memory pressure every 10 pages
          if (pageCount % 10 === 0) {
            const totalData = allUserPosts.length + allUserComments.length;
            const memoryStatus = await checkMemoryPressure(totalData);
            if (memoryStatus.memoryPressure) {
              setStatus(`Memory pressure detected - stopping at ${allUserComments.length} comments`);
              break;
            }
          }
        }
        
        if (pageCount > 200) {
          setStatus('Stopping at 200 pages - you have a lot of comments!');
          break;
        }
        
        // Dynamic delay based on app state - slower when backgrounded
        const isBackgrounded = appStateRef.current !== 'active';
        const delay = isBackgrounded ? 800 : 200;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Additional yield every few pages to prevent UI blocking
        if (pageCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } while (cursor);

      setAllComments(allUserComments);
      
      // Process analytics
      setStatus('Processing analytics...');
      setProgress(0.9);
      setBackgroundProgress({ 
        progress: 0.9, 
        status: 'Processing analytics...', 
        phase: 'analytics',
        postsCount: allUserPosts.length,
        commentsCount: allUserComments.length 
      });
      
      const analytics = processAnalytics(allUserPosts, allUserComments);
      setStats(analytics);
      
      // Update cache timestamp
      setCacheTimestamp(Date.now());
      
      // Clear background processing state
      setIsBackgroundFetching(false);
      setBackgroundProgress(null);
      
      setProgress(1);
      setStatus(`Complete! Analyzed ${allUserPosts.length} posts and ${allUserComments.length} comments`);
      
      crashlytics().log(`User stats completed: ${allUserPosts.length} posts, ${allUserComments.length} comments`);
      
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setStatus(`Error: ${error.message}`);
      crashlytics().recordError(error);
      
      // Clean up background state on error
      setIsBackgroundFetching(false);
      setBackgroundProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (posts, comments) => {
    const now = new Date();
    // Don't create another massive array - iterate separately to save memory
    
    // Basic stats
    const totalPosts = posts.length;
    const totalComments = comments.length;
    const totalContent = totalPosts + totalComments;
    
    // Vote analytics
    const totalPostVotes = posts.reduce((sum, post) => sum + (post.vote_total || 0), 0);
    const totalCommentVotes = comments.reduce((sum, comment) => sum + (comment.vote_total || 0), 0);
    const avgPostVotes = totalPosts > 0 ? (totalPostVotes / totalPosts).toFixed(1) : 0;
    const avgCommentVotes = totalComments > 0 ? (totalCommentVotes / totalComments).toFixed(1) : 0;
    
    // Find top content
    const topPost = posts.length > 0 ? posts.reduce((max, post) => 
      (post.vote_total || 0) > (max.vote_total || 0) ? post : max
    ) : null;
    
    const topComment = comments.length > 0 ? comments.reduce((max, comment) => 
      (comment.vote_total || 0) > (max.vote_total || 0) ? comment : max
    ) : null;
    
    // Time-based analytics
    const hourCounts = Array(24).fill(0);
    const monthCounts = Array(12).fill(0);
    const dayOfWeekCounts = Array(7).fill(0);
    
    // Process posts and comments separately to avoid creating massive combined array
    posts.forEach(item => {
      if (item.created_at) {
        const date = new Date(item.created_at);
        hourCounts[date.getHours()]++;
        monthCounts[date.getMonth()]++;
        dayOfWeekCounts[date.getDay()]++;
      }
    });
    
    comments.forEach(item => {
      if (item.created_at) {
        const date = new Date(item.created_at);
        hourCounts[date.getHours()]++;
        monthCounts[date.getMonth()]++;
        dayOfWeekCounts[date.getDay()]++;
      }
    });
    
    // Find peak activity
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts))
    ];
    
    // Account age and activity - find oldest from both arrays separately
    let oldestContent = null;
    
    if (posts.length > 0) {
      oldestContent = posts.reduce((oldest, item) => {
        const itemDate = new Date(item.created_at);
        const oldestDate = new Date(oldest.created_at);
        return itemDate < oldestDate ? item : oldest;
      });
    }
    
    if (comments.length > 0) {
      const oldestComment = comments.reduce((oldest, item) => {
        const itemDate = new Date(item.created_at);
        const oldestDate = new Date(oldest.created_at);
        return itemDate < oldestDate ? item : oldest;
      });
      
      if (!oldestContent || new Date(oldestComment.created_at) < new Date(oldestContent.created_at)) {
        oldestContent = oldestComment;
      }
    }
    
    const accountAgeMonths = oldestContent ? 
      Math.max(1, Math.round((now - new Date(oldestContent.created_at)) / (1000 * 60 * 60 * 24 * 30))) : 0;
    
    const avgPostsPerMonth = accountAgeMonths > 0 ? (totalPosts / accountAgeMonths).toFixed(1) : 0;
    const avgCommentsPerMonth = accountAgeMonths > 0 ? (totalComments / accountAgeMonths).toFixed(1) : 0;
    
    return {
      totalPosts,
      totalComments,
      totalContent,
      totalPostVotes,
      totalCommentVotes,
      avgPostVotes,
      avgCommentVotes,
      topPost,
      topComment,
      peakHour,
      peakDay,
      accountAgeMonths,
      avgPostsPerMonth,
      avgCommentsPerMonth,
      hourCounts,
      monthCounts,
      dayOfWeekCounts,
    };
  };

  // Calculate analytics based on current time period
  const currentAnalytics = stats ? (() => {
    const filtered = getFilteredContent();
    return processAnalytics(filtered.posts, filtered.comments);
  })() : null;

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };
  
  // Calendar state for monthly heatmap
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const StatTile = ({ title, value, subtitle }) => (
    <Surface style={{ 
      flex: 1, 
      margin: 4, 
      borderRadius: 12, 
      padding: 16,
      backgroundColor: colors.elevation.level1,
      minHeight: 80,
      justifyContent: 'center'
    }}>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}>
        {title}
      </Text>
      <Text variant="titleLarge" style={{ fontWeight: 'bold', color: colors.onSurface }}>
        {value}
      </Text>
      {subtitle && (
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 2 }}>
          {subtitle}
        </Text>
      )}
    </Surface>
  );

  const TimeFilterButtons = () => {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text variant="titleSmall" style={{ marginBottom: 12, textAlign: 'center' }}>
          Time Period
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Chip
            selected={timeFilter === 'all'}
            onPress={() => setTimeFilter('all')}
            mode={timeFilter === 'all' ? 'flat' : 'outlined'}
          >
            All Time
          </Chip>
          <Chip
            selected={timeFilter === 'month'}
            onPress={() => setTimeFilter('month')}
            mode={timeFilter === 'month' ? 'flat' : 'outlined'}
          >
            Past Month
          </Chip>
          <Chip
            selected={timeFilter === 'week'}
            onPress={() => setTimeFilter('week')}
            mode={timeFilter === 'week' ? 'flat' : 'outlined'}
          >
            Past Week
          </Chip>
        </View>
      </View>
    );
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content 
          title="Analytics" 
          subtitle={isBackgroundFetching ? "Processing in background..." : undefined}
        />
        {isBackgroundFetching && (
          <ActivityIndicator size="small" style={{ marginRight: 16 }} />
        )}
      </Appbar.Header>
      
      <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              Personal Analytics Dashboard
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>
              Analyze your posting behavior, activity patterns, and content performance.
            </Text>
            {!stats && !loading && (
              <>
                <Button 
                  mode="contained" 
                  onPress={() => fetchAllContent(false)}
                  icon="chart-line"
                >
                  Fetch Analytics
                </Button>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 8, fontStyle: 'italic' }}>
                  This will take a few minutes. Feel free to browse the app while we work in the background!
                </Text>
              </>
            )}
            {stats && !loading && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
                Last updated: {getCacheAge()}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Time Filter */}
        {stats && (
          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <TimeFilterButtons />
            </Card.Content>
          </Card>
        )}

        {loading && (
          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                {isBackgroundFetching && appStateRef.current !== 'active' ? 'Processing in Background...' : 'Collecting Data...'}
              </Text>
              <ProgressBar progress={progress} style={{ marginBottom: 8 }} />
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {status}
              </Text>
              {isBackgroundFetching && (
                <Text variant="bodySmall" style={{ color: colors.primary, marginTop: 4, fontStyle: 'italic' }}>
                  You can navigate away - we'll continue processing in the background
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {!loading && status && (
          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {status}
              </Text>
            </Card.Content>
          </Card>
        )}

        {currentAnalytics && (
          <>
            {/* Statistics Grid */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <StatTile 
                title="Total Posts" 
                value={currentAnalytics.totalPosts}
              />
              <StatTile 
                title="Total Comments" 
                value={currentAnalytics.totalComments}
              />
            </View>
            
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <StatTile 
                title="Avg Post Votes" 
                value={currentAnalytics.avgPostVotes}
              />
              <StatTile 
                title="Avg Comment Votes" 
                value={currentAnalytics.avgCommentVotes}
              />
            </View>
            
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <StatTile 
                title="Peak Hour" 
                value={formatHour(currentAnalytics.peakHour)}
              />
              <StatTile 
                title="Peak Day" 
                value={currentAnalytics.peakDay}
              />
            </View>
            
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <StatTile 
                title="Posts/Month" 
                value={currentAnalytics.avgPostsPerMonth}
              />
              <StatTile 
                title="Comments/Month" 
                value={currentAnalytics.avgCommentsPerMonth}
              />
            </View>

            {/* Top Post - Full Width */}
            {currentAnalytics.topPost && (
              <Card style={{ marginBottom: 16 }}>
                <Card.Content>
                  <Text variant="titleSmall" style={{ marginBottom: 8 }}>Top Post</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {currentAnalytics.topPost.vote_total} votes
                  </Text>
                  <Text variant="bodyMedium" numberOfLines={3} style={{ color: colors.onSurfaceVariant }}>
                    "{currentAnalytics.topPost.text}"
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Hourly Activity Chart */}
            <Card style={{ marginBottom: 16 }}>
              <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 12 }}>Hourly Activity</Text>
                <View style={{ height: 120, paddingBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, marginBottom: 8 }}>
                    {currentAnalytics.hourCounts.map((count, hour) => {
                      const maxCount = Math.max(...currentAnalytics.hourCounts);
                      const height = maxCount > 0 ? (count / maxCount) * 70 : 0;
                      return (
                        <View key={hour} style={{ alignItems: 'center', flex: 1 }}>
                          <Surface 
                            style={{ 
                              width: Math.max(2, (width - 100) / 24), 
                              height: Math.max(2, height), 
                              backgroundColor: colors.primary,
                              borderRadius: 1
                            }} 
                          />
                        </View>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {[0, 6, 12, 18].map(hour => (
                      <Text key={hour} variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                        {formatHour(hour)}
                      </Text>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Day of Week Chart */}
            <Card style={{ marginBottom: 16 }}>
              <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 12 }}>Day of Week Activity</Text>
                <View style={{ height: 120, paddingBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, marginBottom: 8 }}>
                    {currentAnalytics.dayOfWeekCounts.map((count, day) => {
                      const maxCount = Math.max(...currentAnalytics.dayOfWeekCounts);
                      const height = maxCount > 0 ? (count / maxCount) * 70 : 0;
                      return (
                        <View key={day} style={{ alignItems: 'center', flex: 1 }}>
                          <Surface 
                            style={{ 
                              width: 30, 
                              height: Math.max(2, height), 
                              backgroundColor: colors.primary,
                              borderRadius: 2
                            }} 
                          />
                        </View>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <Text key={day} variant="labelSmall" style={{ color: colors.onSurfaceVariant, textAlign: 'center', flex: 1 }}>
                        {day}
                      </Text>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Monthly Calendar Heatmap */}
            <Card style={{ marginBottom: 16 }}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text variant="titleSmall">Monthly Activity</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Button
                      mode="text"
                      onPress={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                      compact
                    >
                      ←
                    </Button>
                    <Text variant="bodyMedium" style={{ minWidth: 100, textAlign: 'center' }}>
                      {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <Button
                      mode="text"
                      onPress={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                      compact
                    >
                      →
                    </Button>
                  </View>
                </View>
                
                {/* Simple calendar grid placeholder */}
                <View style={{ backgroundColor: colors.elevation.level2, padding: 16, borderRadius: 8 }}>
                  <Text variant="bodySmall" style={{ textAlign: 'center', color: colors.onSurfaceVariant }}>
                    Calendar heatmap coming soon
                  </Text>
                  <Text variant="bodySmall" style={{ textAlign: 'center', color: colors.onSurfaceVariant, marginTop: 4 }}>
                    Will show daily post/comment activity
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {/* Data Management */}
            <Card style={{ marginBottom: 16 }}>
              <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 12 }}>Data Management</Text>
                <View style={{ gap: 8 }}>
                  <Button 
                    mode="contained" 
                    onPress={() => fetchAllContent(true)}
                    icon="refresh"
                    disabled={loading}
                  >
                    Refresh Analytics
                  </Button>
                  <Button 
                    mode="outlined" 
                    onPress={clearCache}
                    icon="delete"
                    disabled={loading}
                  >
                    Clear Cache
                  </Button>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    Cache: {cacheTimestamp ? getCacheAge() : 'No cached data'}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default UserStatsScreen;