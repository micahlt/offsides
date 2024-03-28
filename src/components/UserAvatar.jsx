import React from 'react';
import { Avatar, Badge, useTheme } from 'react-native-paper';
import GroupAvatar from './GroupAvatar';
import { useNavigation } from '@react-navigation/native';

function UserAvatar({
  conversationIcon,
  group,
  size = 45,
  borderRadius = 12,
  numberAlias,
  hideGroup = false,
}) {
  const nav = useNavigation();
  const { colors } = useTheme();
  return React.useCallback(
    <>
      {conversationIcon?.emoji || numberAlias ? (
        <>
          <Avatar.Text
            size={size}
            label={String(conversationIcon?.emoji || numberAlias)}
            color={conversationIcon ? 'white' : undefined}
            style={{
              backgroundColor:
                conversationIcon?.color || group?.color || colors.primary,
              borderRadius: borderRadius,
            }}></Avatar.Text>
          {group && !hideGroup && (
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
          )}
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
