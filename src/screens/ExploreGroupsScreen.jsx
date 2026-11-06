import React from 'react';
import { View, StatusBar, FlatList, StyleSheet } from 'react-native';
import {
  Appbar,
  useTheme,
  Icon,
  ProgressBar,
  Searchbar,
  Snackbar,
  Text,
} from 'react-native-paper';
import { AppContext } from '../App';
import Group from '../components/Group';
import { useMMKVObject } from 'react-native-mmkv';

function ExploreGroupsScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [groups, setGroups] = React.useState([]);
  const [, setCurrentGroup] = useMMKVObject('currentGroup');
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [error, setError] = React.useState('');
  const searchRequest = React.useRef(0);
  const { colors } = useTheme();

  const loadGroups = React.useCallback(async () => {
    setLoading(true);
    try {
      const g = await API.getAvailableGroups();
      setGroups((g || []).filter(group => group.name));
    } catch (e) {
      setError(e.message || 'Could not load groups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API]);

  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  React.useEffect(() => {
    const query = searchQuery.trim();
    const requestID = searchRequest.current + 1;
    searchRequest.current = requestID;
    const timeout = setTimeout(async () => {
      if (query.length < 2) {
        loadGroups(false);
        return;
      }
      setLoading(true);
      try {
        const results = await API.searchAvailableGroups(query);
        if (searchRequest.current === requestID) {
          setGroups((results || []).filter(g => g.name));
        }
      } catch (e) {
        if (searchRequest.current === requestID) {
          setError(e.message || 'Could not search groups.');
        }
      } finally {
        if (searchRequest.current === requestID) {
          setLoading(false);
        }
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [API, loadGroups, searchQuery]);

  const refresh = async () => {
    setRefreshing(true);
    if (searchQuery.trim().length >= 2) {
      try {
        const results = await API.searchAvailableGroups(searchQuery.trim());
        setGroups((results || []).filter(g => g.name));
      } catch (e) {
        setError(e.message || 'Could not refresh search results.');
      } finally {
        setRefreshing(false);
      }
    } else {
      loadGroups();
    }
  };

  const renderGroup = item => {
    const group = item.item;
    return (
      <Group
        group={group}
        key={group.id}
        onPress={() => selectGroup(group)}
        exploreMode={true}
      />
    );
  };

  const selectGroup = group => {
    setCurrentGroup(group);
    navigation.push('Home');
  };

  const visibleGroups = React.useMemo(() => {
    return [...groups].sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
  }, [groups]);

  const isSearching = searchQuery.trim().length >= 2;

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Explore Groups" />
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={loading} />
      <View style={style.searchContainer}>
        <Searchbar
          placeholder="Search groups"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={{ backgroundColor: colors.elevation.level1 }}
        />
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
          {isSearching ? 'Search results' : 'Popular groups'}
        </Text>
      </View>
      <FlatList
        estimatedItemSize={110}
        windowSize={13}
        contentContainerStyle={style.listContent}
        data={visibleGroups}
        keyExtractor={g => g.id}
        renderItem={renderGroup}
        onRefresh={refresh}
        refreshing={refreshing}
        ListEmptyComponent={() => (
          <View style={style.emptyState}>
            <Icon
              source={isSearching ? 'magnify-close' : 'earth-off'}
              size={96}
              color={colors.secondaryContainer}
            />
            <Text variant="titleMedium">
              {isSearching ? 'No groups found' : 'No groups available'}
            </Text>
            <Text
              variant="bodyMedium"
              style={[style.emptyText, { color: colors.onSurfaceVariant }]}>
              {isSearching
                ? 'Try a broader name, topic, or school.'
                : 'Pull to refresh and check again.'}
            </Text>
          </View>
        )}
      />
      <Snackbar visible={!!error} onDismiss={() => setError('')}>
        {error}
      </Snackbar>
    </View>
  );
}

export default ExploreGroupsScreen;

const style = StyleSheet.create({
  searchContainer: {
    gap: 8,
    padding: 10,
  },
  listContent: {
    padding: 10,
    paddingTop: 0,
    rowGap: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 4,
    textAlign: 'center',
  },
});
