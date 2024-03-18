import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View } from 'react-native';
import {
  Card,
  Icon,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import timesago from 'timesago';
import { AppContext } from '../App';

function ActivityItem({ activity }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const nav = useNavigation();
  const { colors } = useTheme();
  const [linkRoute, setLinkRoute] = React.useState('');
  const [linkProps, setLinkProps] = React.useState({});
  React.useEffect(() => {
    setLinkRoute('Comments');
    setLinkProps({ postID: activity.post_id });
  }, [activity]);
  const RenderedContent = () => {
    if (activity.type == 'votes') {
      return (
        <Card.Content style={{ padding: 15 }}>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Icon
              source="arrow-up-bold-box"
              color={colors.primary}
              size={20}></Icon>
            <Text
              variant="labelLarge"
              style={{ marginLeft: 5, color: colors.primary, flex: 1 }}>
              Votes
            </Text>
            <Text variant="bodySmall">{timesago(activity.timestamp)}</Text>
          </View>
          <Text variant="bodyMedium" style={{ color: colors.secondary }}>
            {activity.text}
          </Text>
        </Card.Content>
      );
    } else if (activity.type == 'trending_post') {
      return (
        <Card.Content style={{ padding: 15 }}>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Icon
              source="chart-timeline-variant-shimmer"
              color={colors.primary}
              size={20}></Icon>
            <Text
              variant="labelLarge"
              style={{ marginLeft: 5, color: colors.primary, flex: 1 }}>
              Popular
            </Text>
            <Text variant="bodySmall">{timesago(activity.timestamp)}</Text>
          </View>
          <Text variant="bodyMedium" style={{ color: colors.secondary }}>
            {activity.text.replaceAll('📈 ', '')}
          </Text>
        </Card.Content>
      );
    } else if (activity.type == 'followed_post') {
      return (
        <Card.Content style={{ padding: 15 }}>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Icon source="forum" color={colors.primary} size={20}></Icon>
            <Text
              variant="labelLarge"
              style={{ marginLeft: 5, color: colors.primary, flex: 1 }}>
              Followed post
            </Text>
            <Text variant="bodySmall">{timesago(activity.timestamp)}</Text>
          </View>
          <Text variant="bodyMedium" style={{ color: colors.secondary }}>
            {activity.text.replaceAll('📈 ', '')}
          </Text>
        </Card.Content>
      );
    }
  };
  return (
    <TouchableRipple
      onPress={() => {
        API.readActivity(activity.id).then(() => {
          nav.navigate(linkRoute, linkProps);
        });
      }}
      borderless={true}
      style={{ borderRadius: 10 }}>
      <Card mode="contained">
        <RenderedContent />
      </Card>
    </TouchableRipple>
  );
}

export default ActivityItem;
