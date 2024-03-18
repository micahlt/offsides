import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppContext } from '../App';
import Group from './Group';

function GroupPicker({ sheetRef }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [groups, setGroups] = React.useState(false);
  const [removeMode, setRemoveMode] = React.useState(false);
  React.useEffect(() => {
    if (API) {
      loadGroups();
    }
  }, [API]);
  const loadGroups = async () => {
    const user = await API.getCurrentUser();
    Promise.all(
      user.memberships.map(m => {
        return API.getGroupMetadata(m.groupId);
      }),
    ).then(data => {
      data = data.filter(g => {
        if (g) return true;
        else return false;
      });
      setGroups(data);
    });
  };
  const selectGroup = group => {
    sheetRef?.current?.close();
    nav.navigate('Home', {
      groupID: group.id,
      groupName: group.name,
      groupImage: group?.icon_url || '',
      groupColor: group.color,
    });
    setRemoveMode(false);
  };
  const explore = () => {
    nav.navigate('ExploreGroups');
    sheetRef?.current?.close();
    setRemoveMode(false);
  };
  return (
    <View>
      {groups ? (
        <ScrollView
          contentContainerStyle={{
            padding: 10,
            paddingBottom: 50,
            rowGap: 10,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ paddingLeft: 10, flex: 1 }}>
              Your groups
            </Text>
            <IconButton
              icon={removeMode ? 'check' : 'pencil'}
              mode={removeMode ? 'contained' : 'contained-tonal'}
              style={{ marginRight: 10 }}
              size={24}
              onPress={() => setRemoveMode(!removeMode)}
            />
            <Button
              icon="earth"
              mode="contained"
              onPress={explore}
              style={{ marginLeft: 'auto', marginRight: 5 }}>
              Explore
            </Button>
          </View>
          <Card mode="elevated">
            <Card.Title
              title="Notice"
              titleVariant="titleMedium"
              titleStyle={{
                color: colors.primary,
                marginBottom: 0,
              }}
              style={{ paddingBottom: 0, marginBottom: -10 }}
            />
            <Card.Content>
              <Text>
                In future releases of Offsides, this modal will only appear when
                you long press the group's icon.
              </Text>
            </Card.Content>
          </Card>
          {groups.map(group => (
            <Group
              group={group}
              key={group.id}
              onPress={() => selectGroup(group)}
              removeMode={removeMode}
              onRemove={() => alert('This feature is coming soon!')}
            />
          ))}
        </ScrollView>
      ) : (
        <ActivityIndicator
          animating={true}
          size={64}
          style={{ marginTop: '55%' }}
        />
      )}
    </View>
  );
}

export default GroupPicker;
