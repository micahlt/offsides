import * as React from 'react';
import { View } from 'react-native';
import Video from 'react-native-video';
const AutoVideo = ({
  src,
  fitWidth = 0,
  srcWidth,
  srcHeight,
  token,
  style = {},
  poster,
}) => {
  const aspect = React.useMemo(() => {
    return srcHeight / srcWidth;
  }, []);
  return React.useCallback(
    <View
      style={{
        borderRadius: 15,
        overflow: 'hidden',
        borderRadius: 10,
        marginBottom: 8,
        width: fitWidth,
        height: fitWidth * aspect,
      }}>
      <Video
        paused={true}
        source={{
          uri: src,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }}
        style={{ width: '100%', height: '100%' }}
        poster={poster || ''}
        resizeMode="cover"
        posterResizeMode="cover"
        controls={true}
        useTextureView={false}
      />
    </View>,
    [],
  );
};

export default AutoVideo;
