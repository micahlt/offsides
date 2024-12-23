import { SidechatSimpleAsset } from 'sidechat.js/src/types';
import React from 'react';
import { View, StatusBar, Image } from 'react-native';
import {
  Appbar,
  useTheme,
  ProgressBar,
  Snackbar,
  TextInput,
  Icon,
  Text,
  TouchableRipple,
  Tooltip,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { AppContext } from '../App';
import { launchImageLibrary } from 'react-native-image-picker';

const BORDER_RADIUS = 10;

function WriterScreen({ navigation, route }) {
  const { mode, groupID, postID, replyID, parentID } = route.params;
  if (mode != 'comment' && mode != 'post') return false;
  const { appState, setAppState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [error, setError] = React.useState(false);
  const [textContent, setTextContent] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [asset, setAsset] = React.useState(
    /** @type {SidechatSimpleAsset} */(null),
  );
  const createPostOrComment = async () => {
    if (mode == 'post') {
      const p = await API.createPost(
        textContent,
        groupID,
        asset ? [asset] : [],
        null,
        null,
        appState.anonMode,
      );
      if (!p?.message) {
        setAppState({ ...appState, postSortMethod: 'recent' });
        navigation.replace('Home');
      }
    } else if (mode == 'comment') {
      if (parentID) {
        const c = await API.createComment(
          postID,
          textContent,
          groupID,
          replyID,
          parentID,
          asset ? [asset] : [],
          null,
          appState.anonMode);
        if (!c?.message) {
          navigation.pop();
        }
      } else {
        const c = await API.createComment(
          postID,
          textContent,
          groupID,
          replyID,
          null,
          asset ? [asset] : [],
          null,
          appState.anonMode);
        if (!c?.message) {
          navigation.pop();
        }
      }
    }
  };

  const uploadImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
      maxHeight: 1800,
      maxWidth: 1800,
    });
    if (result.didCancel || result.errorMessage) return;
    setIsUploading(true);
    const photo = result.assets[0];
    photo.height;
    const assetURL = await API.uploadAsset(
      photo.uri,
      photo.type,
      photo.fileName,
    );
    setIsUploading(false);
    setAsset({
      url: assetURL,
      type: photo.type.split('/')[0],
      height: photo.height,
      width: photo.width,
      content_type: photo.type.split('/')[1],
      id: assetURL.split('/v1/assets/library/')[1],
    });
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`New ${mode}`} />
        <Tooltip title="Anonymous mode">
          <Appbar.Action
            icon={appState.anonMode ? 'incognito' : 'incognito-off'}
            onPress={() =>
              setAppState({ ...appState, anonMode: !appState.anonMode })
            }
          />
        </Tooltip>
        <Appbar.Action
          icon="send"
          onPress={createPostOrComment}
          disabled={textContent.length < 1}
          isLeading={true}
        />
      </Appbar.Header>
      <ProgressBar
        indeterminate={true}
        visible={false}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <View style={{ flexDirection: 'column', flex: 1 }}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={{
              flex: 1,
              borderRadius: BORDER_RADIUS,
              borderBottomWidth: 0,
              backgroundColor: colors.elevation.level3,
              fontSize: 20,
              marginHorizontal: 10,
              marginVertical: 15,
              flexDirection: 'column',
            }}
            contentStyle={{
              height: '100%',
              paddingTop: 10,
              paddingBottom: 10,
            }}
            outlineStyle={{ borderRadius: BORDER_RADIUS }}
            mode="outlined"
            multiline={true}
            placeholder={`Write your ${mode} here...`}
            value={textContent}
            onChangeText={val => setTextContent(val)}
          />
        </View>
        <View
          style={{
            backgroundColor: colors.elevation.level5,
            flex: 0.3,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
          }}>
          {asset ? (
            <View style={{ position: 'relative' }}>
              <IconButton
                icon="delete"
                onPress={() => setAsset(null)}
                containerColor={colors.outline}
                iconColor={colors.inverseOnSurface}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  zIndex: 2,
                }}
              />
              <Image
                height="80%"
                resizeMode="cover"
                style={{
                  borderStyle: 'solid',
                  aspectRatio: '1 / 1',
                  borderWidth: 2,
                  borderRadius: BORDER_RADIUS,
                  borderColor: colors.outline,
                  height: '80%',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                source={{
                  uri: asset.url,
                  headers: {
                    Authorization: `Bearer ${API.userToken}`,
                  },
                }}
              />
            </View>
          ) : (
            <TouchableRipple
              onPress={uploadImage}
              style={{ borderRadius: BORDER_RADIUS }}
              borderless={true}>
              <View
                style={{
                  borderStyle: 'dashed',
                  aspectRatio: '1 / 1',
                  borderWidth: 2,
                  borderRadius: BORDER_RADIUS,
                  borderColor: colors.outline,
                  height: '80%',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {isUploading ? (
                  <ActivityIndicator animating={true} />
                ) : (
                  <>
                    <Icon
                      source="image-plus"
                      size={32}
                      color={colors.primary}
                    />
                    <Text
                      style={{ marginTop: 10, color: colors.onSurface }}
                      variant="labelMedium">
                      Add image
                    </Text>
                  </>
                )}
              </View>
            </TouchableRipple>
          )}
        </View>
      </View>
      <Snackbar visible={error} onDismiss={() => setError(false)}>
        Sorry, there was an error creating this {mode}.
      </Snackbar>
    </View>
  );
}

export default WriterScreen;
