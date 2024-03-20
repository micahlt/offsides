import React from 'react';
import { Avatar, Badge, useTheme } from 'react-native-paper';
import GroupAvatar from './GroupAvatar';
import { useNavigation } from '@react-navigation/native';

function UserAvatar({ conversationIcon, group, size = 45, borderRadius = 12 }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  return React.useCallback(
    <>
      {conversationIcon?.emoji ? (
        <>
          <Avatar.Text
            size={size}
            label={String(conversationIcon.emoji)}
            color="white"
            style={{
              backgroundColor: conversationIcon.color || colors.primary,
              borderRadius: borderRadius,
            }}></Avatar.Text>
          <GroupAvatar
            groupColor={group.color}
            groupImage={group.icon_url}
            groupName={group.name}
            onPress={() =>
              nav.navigate('Home', {
                groupID: group.id,
                groupColor: group.color,
                groupImage: group.icon_url,
                groupName: group.name,
              })
            }
            style={{
              position: 'absolute',
              bottom: 5 - size / 5,
              left: size - 5 - size / 5,
              overflow: 'hidden',
            }}
            size={20}
            borderRadius={borderRadius / 2}
          />
        </>
      ) : (
        <GroupAvatar
          groupColor={group.color}
          groupImage={group.icon_url}
          groupName={group.name}
          onPress={() =>
            nav.navigate('Home', {
              groupID: group.id,
              groupColor: group.color,
              groupImage: group.icon_url,
              groupName: group.name,
            })
          }
        />
      )}
    </>,
    [],
  );
}

export default UserAvatar;
