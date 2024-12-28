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
import { useMMKVObject } from 'react-native-mmkv';

function GroupPicker({ sheetRef }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [groups, setGroups] = useMMKVObject('userGroups');
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');
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
    if (!currentGroup) {
      const g = await API.getGroupMetadata(appState.groupID);
      setCurrentGroup(g);
    }
  };
  const selectGroup = group => {
    console.log('Group selected');
    crashlytics().log('Group selected');
    sheetRef?.current?.close();
    setCurrentGroup(group);
    setRemoveMode(false);
    loadGroups();
  };
  const explore = () => {
    nav.push('ExploreGroups');
    sheetRef?.current?.close();
    setRemoveMode(false);
    loadGroups();
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
    loadGroups();
  };

  const leaveGroup = async id => {
    crashlytics().log('Leaving a group');
    const leaveReq = await API.setGroupMembership(id);
    await leaveReq;
    loadGroups();
  };

  return (<>
    {groups && currentGroup ? (
      <ScrollView
        contentContainerStyle={{
          padding: 10,
          paddingBottom: 50,
          paddingTop: 0,
          rowGap: 10,
        }}
        nestedScrollEnabled={true}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="headlineMedium" style={{ paddingLeft: 10, flexGrow: 1 }}>
            Your groups
          </Text>
          <IconButton
            icon={removeMode ? 'check' : 'pencil'}
            mode={removeMode ? 'contained' : 'contained-tonal'}
            style={{ marginRight: 10 }}
            size={24}
            onPressOut={() => setRemoveMode(!removeMode)}
          />
          <Button
            icon="earth"
            mode="contained"
            onPressOut={explore}
            style={{ marginLeft: 'auto', marginRight: 5 }}>
            Explore
          </Button>
        </View>
        <Card mode="elevated" style={{ marginBottom: 7 }}>
          <Card.Title
            title={currentGroup.name}
            right={() => (
              <View style={{ flexDirection: 'row' }}>
                {currentGroup.name != 'Home' &&
                  currentGroup.id != appState.schoolGroupID ? (
                  <Chip
                    icon={
                      currentGroup.membership_type == 'member'
                        ? 'account-remove'
                        : 'plus'
                    }
                    style={{ marginRight: 5 }}
                    onPressOut={changeCurrentMembership}>
                    {currentGroup.membership_type == 'member'
                      ? 'Leave'
                      : 'Join'}
                  </Chip>
                ) : (
                  currentGroup.id == appState.schoolGroupID && (
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
      <View>
        <ActivityIndicator
          animating={true}
          size={64}
          style={{ marginTop: 200, marginBottom: 200 }}
        />
      </View>
    )}
  </>
  );
}

export default GroupPicker;
