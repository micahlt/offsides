import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import crashlytics from '@react-native-firebase/crashlytics';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
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
  const [currentGroup, setCurrentGroup] = React.useState(false);
  const [removeMode, setRemoveMode] = React.useState(false);
  React.useEffect(() => {
    if (API) {
      crashlytics().log('Loading GroupPicker');
      loadGroups();
      getCurrentGroup();
    }
  }, [API]);
  const loadGroups = async () => {
    crashlytics().log("Fetching user's groups");
    const updates = await API.getUpdates(appState.schoolGroupID);
    setGroups(updates.groups);
  };
  const getCurrentGroup = async () => {
    crashlytics().log('Fetching current group metadata');
    const g = await API.getGroupMetadata(appState.groupID);
    setCurrentGroup(g);
  };
  const selectGroup = group => {
    crashlytics().log('Group selected');
    sheetRef?.current?.close();
    nav.push('Home', {
      groupID: group.id,
      groupName: group.name,
      groupImage: group?.icon_url || '',
      groupColor: group.color,
      animation: 'none',
    });
    setRemoveMode(false);
  };
  const explore = () => {
    nav.push('ExploreGroups');
    sheetRef?.current?.close();
    setRemoveMode(false);
  };

  const changeCurrentMembership = async () => {
    crashlytics().log('Changing current group membership');
    const isCurrentlyMember = currentGroup.membership_type == 'member';
    const a = await API.setGroupMembership(currentGroup.id, !isCurrentlyMember);
    await a;
    setCurrentGroup({
      ...currentGroup,
      membership_type: isCurrentlyMember ? 'non_member' : 'member',
    });
  };

  const leaveGroup = async id => {
    crashlytics().log('Leaving a group');
    const leaveReq = await API.setGroupMembership(id);
    await leaveReq;
    setGroups(groups.filter(g => g.id != id));
  };

  return (
    <View>
      {groups && currentGroup ? (
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
          <Card mode="elevated" style={{ marginBottom: 7 }}>
            <Card.Title
              title={appState.groupName}
              right={() => (
                <View style={{ flexDirection: 'row' }}>
                  {appState.groupName != 'Home' &&
                  appState.groupID != appState.schoolGroupID ? (
                    <Chip
                      icon={
                        currentGroup.membership_type == 'member'
                          ? 'account-remove'
                          : 'plus'
                      }
                      style={{ marginRight: 5 }}
                      onPress={changeCurrentMembership}>
                      {currentGroup.membership_type == 'member'
                        ? 'Leave'
                        : 'Join'}
                    </Chip>
                  ) : (
                    appState.groupID == appState.schoolGroupID && (
                      <Chip
                        icon="school"
                        style={{ marginRight: 5 }}
                        mode="outlined">
                        School
                      </Chip>
                    )
                  )}
                  <Chip style={{ marginRight: 15 }} mode="outlined">
                    Current
                  </Chip>
                </View>
              )}
              titleVariant="titleMedium"
              titleStyle={{
                color: colors.primary,
                marginBottom: 0,
              }}
              style={{ paddingBottom: 0, marginBottom: -2 }}
            />
            {currentGroup.description && (
              <Card.Content style={{ marginTop: -5 }}>
                <Text>{currentGroup.description}</Text>
              </Card.Content>
            )}
          </Card>
          {groups
            .filter(g => g.id != currentGroup.id)
            .map(group => (
              <Group
                group={group}
                key={group.id}
                onPress={() => selectGroup(group)}
                removeMode={removeMode}
                onRemove={() => leaveGroup(group.id)}
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
