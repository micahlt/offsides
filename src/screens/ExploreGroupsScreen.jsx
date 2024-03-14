import React from 'react';
import { View, StatusBar, FlatList } from 'react-native';
import { Appbar, useTheme, Card, ProgressBar } from 'react-native-paper';
import { AppContext } from '../App';
import Group from '../components/Group';
import useUniqueList from '../hooks/useUniqueList';

const BORDER_RADIUS = 15;

function ExploreGroupsScreen({ navigation }) {
  const { appState, setAppState } = React.useContext(AppContext);
  const API = appState.API;
  const [groups, setGroups] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
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
    setAppState({
      ...appState,
      groupID: group.id,
      groupName: group.name,
      groupImage: group?.icon_url || '',
    });
    navigation.navigate('Home');
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Explore Groups" />
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={loading} />
      {groups && (
        <FlatList
          contentContainerStyle={{
            rowGap: 10,
            padding: 10,
          }}
          data={groups}
          keyExtractor={g => g.id}
          renderItem={renderGroup}
        />
      )}
    </View>
  );
}

export default ExploreGroupsScreen;
