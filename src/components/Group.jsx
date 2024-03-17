import React from 'react';
import { View, Image } from 'react-native';
import {
  Card,
  Text,
  Avatar,
  Icon,
  TouchableRipple,
  IconButton,
  useTheme,
} from 'react-native-paper';
import GroupAvatar from './GroupAvatar';

function Group({
  group,
  cardMode = 'contained',
  onPress = () => {},
  exploreMode = false,
  removeMode = false,
  onRemove = () => {},
}) {
  const { colors } = useTheme();
  return (
    <TouchableRipple
      borderless={true}
      onPress={onPress}
      style={{ borderRadius: 10 }}>
      <Card mode={cardMode}>
        <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <GroupAvatar
              groupImage={group.icon_url}
              groupColor={group.color}
              groupName={group.name}
              onPress={null}
              onLongPress={null}
              style={{ marginRight: 15 }}
            />
            <Text variant="titleMedium" style={{ flex: 1 }}>
              {group.name}
            </Text>
            {removeMode ? (
              <IconButton
                icon="delete"
                size={24}
                style={{ height: 30, width: 30 }}
                onPress={() => onRemove(group.id)}
                iconColor={colors.error}
              />
            ) : (
              <>
                {group.membership_type == 'member' && (
                  <Icon source="check" size={24} />
                )}
                <Text style={{ marginRight: 10 }} />
                {group.group_visibility == 'public_to_all' && (
                  <Icon source="earth" size={24} />
                )}
                {group.group_visibility == 'private' && (
                  <Icon source="lock" size={24} />
                )}
                {group.group_visibility == 'public_to_schools' && (
                  <Icon source="school" size={24} />
                )}
              </>
            )}
          </View>
          {exploreMode && (
            <Text style={{ marginTop: 10, opacity: 0.8 }}>
              {group.description}
              {group.member_count && (
                <Text
                  style={{ marginTop: 10, opacity: 0.8, fontWeight: 'bold' }}>
                  {group.description && `  |  `}
                  {group.member_count.toLocaleString()} members
                </Text>
              )}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableRipple>
  );
}

export default Group;
