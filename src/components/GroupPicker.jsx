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
  Snackbar,
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
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    if (API) {
      crashlytics().log('Loading GroupPicker');
      loadGroups();
      getCurrentGroup();
    }
  }, [API]);
  const loadGroups = async () => {
    crashlytics().log("Fetching user's groups");
    try {
      const updates = await API.getUpdates(appState.schoolGroupID);
      // An error body has no groups - keep the cached list instead of wiping it.
      if (Array.isArray(updates?.groups)) setGroups(updates.groups);
    } catch (e) {
      console.log(e);
      crashlytics().recordError(e);
    }
  };
  const getCurrentGroup = async () => {
    crashlytics().log('Fetching current group metadata');
    if (!currentGroup) {
      const g = await API.getGroupMetadata(currentGroup.id);
      setCurrentGroup(g);
    }
  };
  const selectGroup = group => {
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
    try {
      const res = await API.setGroupMembership(currentGroup.id, !isCurrentlyMember);
      // sidechat.js returns the error body instead of throwing on a refusal.
      if (res?.error_code) throw new Error(res.message);
      setCurrentGroup({
        ...currentGroup,
        membership_type: isCurrentlyMember ? 'non_member' : 'member',
      });
    } catch (e) {
      setError(e?.message || `Couldn't ${isCurrentlyMember ? 'leave' : 'join'} this group.`);
    }
    loadGroups();
  };

  const leaveGroup = async id => {
    crashlytics().log('Leaving a group');
    try {
      const res = await API.setGroupMembership(id);
      if (res?.error_code) throw new Error(res.message);
    } catch (e) {
      setError(e?.message || "Couldn't leave this group.");
    }
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
                    onPress={changeCurrentMembership}>
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
    <Snackbar visible={!!error} onDismiss={() => setError('')}>
      {error}
    </Snackbar>
  </>
  );
}

export default GroupPicker;
