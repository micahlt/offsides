import React from 'react';
import { View, StatusBar, FlatList } from 'react-native';
import {
  Appbar,
  useTheme,
  Card,
  ProgressBar,
  Searchbar,
} from 'react-native-paper';
import { AppContext } from '../App';
import Group from '../components/Group';
import { useMMKVObject } from 'react-native-mmkv';

const BORDER_RADIUS = 15;

function ExploreGroupsScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [groups, setGroups] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject("currentGroup");
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { colors } = useTheme();
  React.useEffect(() => {
    loadGroups();
  }, []);
  const loadGroups = async () => {
    const g = await API.getAvailableGroups();
    setGroups(g.filter(g => g.name));
    setLoading(false);
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

  const groupsSearched = React.useMemo(() => {
    if (groups) {
      return groups.sort((a, b) => a.member_count < b.member_count).filter(item => {
        if (
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          searchQuery.toLowerCase().includes(item.name.toLowerCase()) ||
          searchQuery.toLowerCase() == item.name.toLowerCase()
        ) {
          return true;
        } else if (item.description) {
          if (
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      });
    } else {
      return [];
    }
  }, [groups, searchQuery]);

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Explore Groups" />
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={loading} />
      {groups && (
        <View style={{ flex: 1 }}>
          <Searchbar
            placeholder="Search groups"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={{
              position: 'absolute',
              zIndex: 1,
              marginHorizontal: 5,
              marginTop: 10,
              backgroundColor: colors.secondaryContainer,
            }}
          />
          <FlatList
            style={{ marginTop: 30 }}
            estimatedItemSize={110}
            windowSize={13}
            contentContainerStyle={{
              rowGap: 10,
              padding: 10,
              paddingTop: 50,
            }}
            data={groupsSearched}
            keyExtractor={g => g.id}
            renderItem={renderGroup}
          />
        </View>
      )}
    </View>
  );
}

export default ExploreGroupsScreen;
