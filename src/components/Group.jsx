import React from 'react';
import { View, Image } from 'react-native';
import { Card, Text, Avatar, Icon, TouchableRipple } from 'react-native-paper';

function Group({
  group,
  cardMode = 'contained',
  onPress,
  exploreMode = false,
}) {
  return (
    <TouchableRipple
      borderless={true}
      onPress={onPress}
      style={{ borderRadius: 5 }}>
      <Card mode={cardMode}>
        <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {group.icon_url ? (
              <Image
                width={45}
                height={45}
                resizeMode="cover"
                source={{ uri: group.icon_url }}
                style={{
                  borderRadius: 10,
                  marginRight: 15,
                  backgroundColor: group.color || colors.primaryContainer,
                }}
              />
            ) : (
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
                  backgroundColor: group.color || colors.primaryContainer,
                }}
              />
            )}
            <Text variant="titleMedium" style={{ flex: 1 }}>
              {group.name}
            </Text>
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
          </View>
          {exploreMode && (
            <Text style={{ marginTop: 10, opacity: 0.8 }}>
              {group.description}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableRipple>
  );
}

export default Group;
