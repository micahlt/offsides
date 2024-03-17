import React from 'react';
import { Image } from 'react-native';
import { TouchableRipple, Avatar, useTheme } from 'react-native-paper';

function GroupAvatar({
  groupName,
  groupImage,
  groupColor,
  onPress = () => {},
  onLongPress = () => {},
  borderRadius = 12,
  style = {},
}) {
  const { colors } = useTheme();
  const ComponentOption = React.useCallback(() => {
    if (groupName == 'Home') {
      return (
        <Avatar.Icon
          icon="home"
          size={45}
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
            height: 45,
            width: 45,
            borderRadius: borderRadius,
          }}
          source={{ uri: groupImage }}
        />
      );
    } else {
      return (
        <Avatar.Text
          size={45}
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
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ borderRadius: borderRadius, ...style }}
      borderless={true}>
      <ComponentOption />
    </TouchableRipple>
  );
}

export default GroupAvatar;
