import * as React from 'react';
import { Image, Linking, Pressable } from 'react-native';
const AutoImage = ({ src, fitWidth = 0, token, style = {} }) => {
  const [aspect, setAspect] = React.useState(0);
  return (
    <Pressable
      onPress={() => Linking.openURL(src)}
      style={{ borderRadius: 7, marginBottom: 5, ...style }}
      useForeground={true}
      android_ripple={{ color: 'rgba(0,0,0,0.2)', foreground: true }}>
      <Image
        source={{
          uri: src,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }}
        style={{
          width: fitWidth,
          height: fitWidth * aspect,
          borderRadius: 7,
        }}
        resizeMode="cover"
        onLoad={({
          nativeEvent: {
            source: { width, height },
          },
        }) => {
          setAspect(height / width);
        }}
      />
    </Pressable>
  );
};

export default AutoImage;
