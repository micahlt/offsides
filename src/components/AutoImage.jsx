import * as React from 'react';
import { Image } from 'react-native';
const AutoImage = ({ src, fitWidth = 0, token, style = {} }) => {
  const [aspect, setAspect] = React.useState(0);
  return (
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
        marginBottom: 5,
        ...style,
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
  );
};

export default AutoImage;
