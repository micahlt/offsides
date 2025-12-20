import { SidechatSimpleAsset } from 'sidechat.js/src/types';
import React, { useEffect } from 'react';
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
  Button,
  Divider,
} from 'react-native-paper';
import { AppContext } from '../App';
import { launchImageLibrary } from 'react-native-image-picker';
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv';
import Post from '../components/Post';

const BORDER_RADIUS = 10;

function WriterScreen({ navigation, route }) {
  const { mode, groupID, postID, replyID, parentID, repostID } = route.params;
  if (mode != 'comment' && mode != 'post') return false;
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [error, setError] = React.useState(false);
  const [textContent, setTextContent] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [postSortMethod, setPostSortMethod] = useMMKVString('postSortMethod');
  const [anonMode, setAnonMode] = useMMKVBoolean('anonMode');
  const [asset, setAsset] = React.useState(
    /** @type {SidechatSimpleAsset} */(null),
  );
  const [repost, setRepost] = React.useState(
    /** @type {SidechatPostOrComment} */(null),
  );
  const [isPoll, setIsPoll] = React.useState(false);
  const [pollOptions, setPollOptions] = React.useState(['', '']);

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 1) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index, text) => {
    const newOptions = [...pollOptions];
    newOptions[index] = text;
    setPollOptions(newOptions);
  };

  React.useEffect(() => {
    if (repostID) {
      API.getPost(repostID).then((p) => {
        if (p) {
          setRepost(p);
        }
      });
    }
  }, [repostID])

  const isPollValid = !isPoll || pollOptions.every(opt => opt.trim().length > 0);

  const createPostOrComment = async () => {
    if (mode == 'post') {
      const validPollOptions = isPoll ? pollOptions : undefined;

      const p = await API.createPost(
        textContent,
        groupID,
        asset ? [asset] : [],
        null,
        null,
        anonMode,
        repostID,
        validPollOptions,
      );
      if (!p?.message) {
        setPostSortMethod('recent');
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
          anonMode);
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
          anonMode);
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
            icon={anonMode ? 'incognito' : 'incognito-off'}
            onPress={() =>
              setAnonMode(!anonMode)
            }
          />
        </Tooltip>
        <Appbar.Action
          icon="send"
          onPress={createPostOrComment}
          disabled={textContent.length < 1 || !isPollValid}
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
          <ProgressBar style={{ marginHorizontal: 11, marginBottom: 5, borderRadius: 10 }} animatedValue={textContent.length / 256} color={textContent.length > 256 ? colors.error : undefined} />
          <Text style={{ marginHorizontal: 10, marginBottom: 10, color: textContent.length <= 256 ? colors.onSurface : colors.error }} variant="labelLarge">
            {textContent.length} / 256 chars
          </Text>
          {mode === 'post' && isPoll && (
            <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
              <Divider style={{ marginBottom: 10 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Icon source="poll" size={20} color={colors.primary} />
                <Text variant="titleMedium" style={{ marginLeft: 8, color: colors.primary }}>Poll Options</Text>
              </View>
              {pollOptions.map((option, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: colors.elevation.level3,
                      borderRadius: BORDER_RADIUS,
                    }}
                    mode="outlined"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChangeText={(text) => updatePollOption(index, text)}
                    maxLength={80}
                  />
                  {pollOptions.length > 2 && (
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => removePollOption(index)}
                    />
                  )}
                </View>
              ))}
              {pollOptions.length < 4 && (
                <Button
                  mode="outlined"
                  onPress={addPollOption}
                  icon="plus"
                  style={{ marginTop: 5 }}
                >
                  Add Option
                </Button>
              )}
            </View>
          )}
          {repost && <View style={{ padding: 10, paddingTop: 0, marginTop: -5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: "flex-start", marginBottom: -5 }}>
              <IconButton icon="repeat-variant" size={24} iconColor={colors.primary} style={{ marginLeft: -5, marginRight: -3 }} />
              <Text variant="labelLarge" style={{ color: colors.primary }}>Reposting</Text>
            </View>
            <Post themeColors={colors} apiInstance={API} post={repost} repost={true} minimal={true} />
          </View>}
        </View>
        <View
          style={{
            backgroundColor: colors.elevation.level5,
            flex: 0.15,
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
          {mode === 'post' && (
            <TouchableRipple
              onPress={() => {
                setIsPoll(!isPoll);
                if (!isPoll) {
                  setPollOptions(['', '']);
                }
              }}
              style={{ borderRadius: BORDER_RADIUS, marginLeft: 15 }}
              borderless={true}>
              <View
                style={{
                  borderStyle: isPoll ? 'solid' : 'dashed',
                  aspectRatio: '1 / 1',
                  borderWidth: 2,
                  borderRadius: BORDER_RADIUS,
                  borderColor: isPoll ? colors.primary : colors.outline,
                  backgroundColor: isPoll ? colors.primaryContainer : 'transparent',
                  height: '80%',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon
                  source="poll"
                  size={32}
                  color={isPoll ? colors.onPrimaryContainer : colors.primary}
                />
                <Text
                  style={{ marginTop: 10, color: isPoll ? colors.onPrimaryContainer : colors.onSurface }}
                  variant="labelMedium">
                  {'Create Poll'}
                </Text>
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
