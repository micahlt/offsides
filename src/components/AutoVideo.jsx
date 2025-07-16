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
  format,
}) => {
  const aspect = React.useMemo(() => {
    return srcHeight / srcWidth;
  }, []);
  return React.useCallback(
    <View
      style={{
        borderRadius: 7,
        overflow: 'hidden',
        borderRadius: 10,
        width: fitWidth,
        height: fitWidth * aspect,
        ...style,
      }}>
      <Video
        paused={true}
        source={{
          uri: src,
          type: 'm3u8',
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
