import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, Vibration, Dimensions, Alert } from 'react-native';
import {
  ActivityIndicator,
  Card,
  Icon,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import crashlytics from '@react-native-firebase/crashlytics';
import timesago from 'timesago';
import { AppContext } from '../App';
import UserAvatar from './UserAvatar';
import Group from './Group';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

function ActivityItem({ activity }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const nav = useNavigation();
  const { colors } = useTheme();
  const [linkRoute, setLinkRoute] = React.useState('');
  const [linkProps, setLinkProps] = React.useState({});
  const [group, setGroup] = React.useState(null);

  React.useEffect(() => {
    crashlytics().log('Loading ActivityItem');
    setLinkRoute('Comments');
    setLinkProps({ postID: activity.post_id });
    crashlytics().log(`Activity type: ${activity.type}`);
    if (activity.type == 'suggested_sidechats') {
      API.getGroupMetadata(
        activity.suggested_sidechats_data.group_ids_to_suggest[0],
      ).then(d => {
        setGroup(d);
      });
    }
  }, [activity]);

  const readActivity = callback => {
    crashlytics().log('Marking activity as read');
    API.readActivity(activity.id).then(callback);
  };

  const deviceWidth = Dimensions.get('window').width;

  const xPos = useSharedValue(0);
  const measuredHeight = useSharedValue(0);
  const heightModifier = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xPos.value }],
    height: heightModifier.value === 1 ? undefined : measuredHeight.value * heightModifier.value,
    opacity: heightModifier.value,
    overflow: 'hidden',
  }));

  const swipeAway = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      xPos.value = e.translationX;
    }).onEnd((e) => {
      const SWIPE_THRESHOLD = deviceWidth / 3;
      const VELOCITY_THRESHOLD = 500;
      const isSwipedEnough = Math.abs(e.translationX) > SWIPE_THRESHOLD;
      const isFling = Math.abs(e.velocityX) > VELOCITY_THRESHOLD;
      const directionsMatch = (e.translationX > 0 && e.velocityX > 0) || (e.translationX < 0 && e.velocityX < 0);

      if (isSwipedEnough || (isFling && directionsMatch)) {
        xPos.value = withTiming(e.translationX > 0 ? deviceWidth : -deviceWidth, { duration: 100 });
        heightModifier.value = withTiming(0, { duration: 200 });
        runOnJS(readActivity)(() => null);
      } else {
        xPos.value = withTiming(0, { duration: 50 });
      }
    });

  const RenderedContent = ({ style }) => {
    if (activity.type == 'votes') {
      return (
        <Card.Content style={{ padding: 15, ...style }}>
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
        <Card.Content style={{ padding: 15, ...style }}>
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
        <Card.Content style={{ padding: 15, ...style }}>
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
    } else if (activity.type == 'suggested_sidechats') {
      return (
        <Card.Content style={{ padding: 15, ...style }}>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Icon source="creation" color={colors.primary} size={20}></Icon>
            <Text
              variant="labelLarge"
              style={{ marginLeft: 5, color: colors.primary, flex: 1 }}>
              Suggested post
            </Text>
            <Text variant="bodySmall">{timesago(activity.timestamp)}</Text>
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: colors.secondary, marginBottom: 10 }}>
            {activity.text}
          </Text>
          {group && (
            <Group
              group={group}
              exploreMode={true}
              cardMode="outlined"
              onPress={() => {
                readActivity(() =>
                  nav.push('Home', {
                    groupID: group.id,
                    groupColor: group.color,
                    groupImage: group.icon_url,
                    groupName: group.name,
                  }),
                );
              }}
            />
          )}
        </Card.Content>
      );
    } else if (activity.type.includes('comment')) {
      return (
        <Card.Content style={{ padding: 15, ...style }}>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Icon source="message" color={colors.primary} size={20}></Icon>
            <Text
              variant="labelLarge"
              style={{ marginLeft: 5, color: colors.primary, flex: 1 }}>
              {activity.type == 'comment_reply' ? 'Comment reply' : 'Comment'}
            </Text>
            <Text variant="bodySmall">{timesago(activity.timestamp)}</Text>
          </View>
          <Text variant="bodyMedium" style={{ color: colors.secondary }}>
            {activity.text}
          </Text>
        </Card.Content>
      );
    } else if (activity.type == 'new_follower') {
      return (
        <Card.Content style={{ padding: 15, ...style }}>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Icon source="account-plus" color={colors.primary} size={20}></Icon>
            <Text
              variant="labelLarge"
              style={{ marginLeft: 5, color: colors.primary, flex: 1 }}>
              New follower
            </Text>
            <Text variant="bodySmall">{timesago(activity.timestamp)}</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {activity.conversation_icon ? (
              <UserAvatar conversationIcon={activity.conversation_icon} />
            ) : (
              <UserAvatar numberAlias="👤" />
            )}
            <Text
              variant="bodyMedium"
              style={{ marginLeft: 10, color: colors.secondary }}>
              {activity.text}
            </Text>
          </View>
        </Card.Content>
      );
    }
  };

  return (
    <GestureDetector gesture={swipeAway}>
      <Animated.View
        style={animatedStyle}
        onLayout={e => {
          measuredHeight.value = e.nativeEvent.layout.height;
        }}>
        <TouchableRipple
          onPress={() => readActivity(() => nav.push(linkRoute, linkProps))}
          borderless={true}
          style={{ borderRadius: 10 }}>
          <Card mode="contained" style={{ justifyContent: 'center' }}>
            <RenderedContent />
          </Card>
        </TouchableRipple>
      </Animated.View>
    </GestureDetector>
  );
}

export default ActivityItem;
