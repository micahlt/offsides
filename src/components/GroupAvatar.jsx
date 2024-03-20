import React from 'react';
import { Image } from 'react-native';
import { TouchableRipple, Avatar, useTheme } from 'react-native-paper';

function GroupAvatar({
  groupName,
  groupImage,
  groupColor,
  onPress,
  onLongPress,
  borderRadius = 12,
  style = {},
  size = 45,
  clickableByDefault = true,
}) {
  const { colors } = useTheme();
  const ComponentOption = React.useCallback(() => {
    if (groupName == 'Home') {
      return (
        <Avatar.Icon
          icon="home"
          size={size}
          style={{
            borderRadius: borderRadius,
            backgroundColor: groupColor || colors.primaryContainer,
          }}
        />
      );
    } else if (groupImage) {
      return (
        <Image
          style={{
            height: size,
            width: size,
            borderRadius: borderRadius,
          }}
          source={{ uri: groupImage }}
        />
      );
    } else {
      return (
        <Avatar.Text
          size={size}
          label={groupName.length < 3 ? groupName : groupName.substring(0, 2)}
          style={{
            borderRadius: borderRadius,
            backgroundColor: groupColor || colors.primaryContainer,
          }}
        />
      );
    }
  }, [groupName]);
  return (
    <TouchableRipple
      onPress={clickableByDefault ? onPress : null}
      onLongPress={clickableByDefault ? onLongPress : null}
      style={{ borderRadius: borderRadius, ...style }}
      borderless={true}>
      <ComponentOption />
    </TouchableRipple>
  );
}

export default GroupAvatar;
