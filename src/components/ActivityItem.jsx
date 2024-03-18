import * as React from 'react';
import { View } from 'react-native';
import { Card, Icon, Text, useTheme } from 'react-native-paper';

function ActivityItem({ activity }) {
  const { colors } = useTheme();
  const Handler = () => {
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
              style={{ marginLeft: 5, color: colors.primary }}>
              Votes
            </Text>
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
              style={{ marginLeft: 5, color: colors.primary }}>
              Popular
            </Text>
          </View>
          <Text variant="bodyMedium" style={{ color: colors.secondary }}>
            {activity.text.replaceAll('📈 ', '')}
          </Text>
        </Card.Content>
      );
    }
  };
  return (
    <Card mode="contained">
      <Handler />
    </Card>
  );
}

export default ActivityItem;
