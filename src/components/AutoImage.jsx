import * as React from 'react';
import ImageModal from 'react-native-image-modal';

const AutoImage = ({
  src,
  fitWidth = 0,
  srcWidth,
  srcHeight,
  token,
  style = {},
}) => {
  const aspect = React.useMemo(() => {
    return srcHeight / srcWidth;
  }, []);
  return React.useCallback(
    <ImageModal
      modalImageResizeMode="contain"
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
        ...style,
      }}
      resizeMode="cover"
    />,
    [],
  );
};

export default AutoImage;
