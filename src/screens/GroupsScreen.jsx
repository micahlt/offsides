import React from 'react';
import { View, StatusBar, ScrollView } from 'react-native';
import {
  Appbar,
  useTheme,
  Text,
  Card,
  Avatar,
  List,
  ProgressBar,
} from 'react-native-paper';
import { AppContext } from '../App';
import * as API from '../utils';
import timesago from 'timesago';

const BORDER_RADIUS = 15;

function GroupsScreen({ navigation }) {
  const appState = React.useContext(AppContext);
  const [data, setData] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { colors } = useTheme();
  React.useEffect(() => {
    API.getUserAndGroup(appState.userToken, appState.groupID).then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Explore Groups" />
        <Appbar.Action
          onPress={() => navigation.navigate('Settings')}
          icon="cog"
        />
      </Appbar.Header>
      <ProgressBar indeterminate={true} visible={loading} />
      {data?.user && (
        <ScrollView contentContainerStyle={{ rowGap: 10, padding: 20 }}>
          <Card style={{ flexGrow: 1 }}>
            <Card.Title
              title="Groups"
              titleVariant="labelLarge"
              titleStyle={{ minHeight: 10 }}
            />
            <Card.Content>
              {data.groups.map(group => (
                <List.Item
                  key={group.id}
                  style={{
                    backgroundColor: colors.elevation.level4,
                    borderRadius: 10,
                  }}
                  titleStyle={{ alignItems: 'center' }}
                  title={
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Avatar.Text
                        size={45}
                        label={
                          group.name.length < 3
                            ? group.name
                            : group.name.substring(0, 2)
                        }
                        style={{
                          borderRadius: 10,
                          marginRight: 15,
                          backgroundColor:
                            group.color || colors.primaryContainer,
                        }}
                      />
                      <Text>{group.name}</Text>
                    </View>
                  }
                  descriptionStyle={{ marginTop: 10 }}
                  description={
                    <>
                      <Text variant="labelMedium">
                        {group.membership_type[0].toUpperCase() +
                          group.membership_type.slice(1)}{' '}
                        •{' '}
                        {group.group_visibility[0].toUpperCase() +
                          group.group_visibility.slice(1)}{' '}
                        group
                      </Text>
                    </>
                  }
                  onPress={() => {}}
                />
              ))}
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

export default GroupsScreen;
