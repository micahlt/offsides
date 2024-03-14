import * as React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Dialog,
  Portal,
  Button,
  ProgressBar,
  useTheme,
} from 'react-native-paper';
import { AppContext } from '../App';
import Group from './Group';

function GroupPicker({ visible, hide }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { appState, setAppState } = React.useContext(AppContext);
  const API = appState.API;
  const [groups, setGroups] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (API && visible) {
      loadGroups();
    }
  }, [visible, API]);
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
      setLoading(false);
    });
  };
  const selectGroup = group => {
    setAppState({
      ...appState,
      groupID: group.id,
      groupName: group.name,
      groupImage: group?.icon_url || '',
    });
    hide();
  };
  const explore = () => {
    nav.navigate('ExploreGroups');
    hide();
  };
  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={hide}
        style={{
          backgroundColor: colors.elevation.level5,
          marginTop: 150,
          marginBottom: 150,
        }}>
        <Dialog.Title>Switch groups</Dialog.Title>
        <ProgressBar indeterminate={true} visible={loading} />
        <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
          {groups && (
            <ScrollView
              contentContainerStyle={{
                padding: 10,
                rowGap: 10,
              }}>
              {groups.map(group => (
                <Group
                  group={group}
                  key={group.id}
                  onPress={() => selectGroup(group)}
                />
              ))}
            </ScrollView>
          )}
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={hide}>Cancel</Button>
          <Button
            onPress={explore}
            mode="contained-tonal"
            style={{ paddingHorizontal: 5 }}>
            Find more
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export default GroupPicker;
