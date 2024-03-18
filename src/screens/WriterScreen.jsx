import React from 'react';
import { View, StatusBar } from 'react-native';
import {
  Appbar,
  useTheme,
  ProgressBar,
  Snackbar,
  TextInput,
  Icon,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import { AppContext } from '../App';
import { Image } from 'react-native-paper/lib/typescript/components/Avatar/Avatar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BORDER_RADIUS = 10;

function WriterScreen({ navigation, route }) {
  const { mode, groupID, postID, replyID } = route.params;
  if (mode != 'comment' && mode != 'post') return false;
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [error, setError] = React.useState(false);
  const [textContent, setTextContent] = React.useState('');
  const createPostOrComment = async () => {
    if (mode == 'post') {
      const p = await API.createPost(textContent, groupID, []);
      if (!p?.message) {
        navigation.navigate('Home');
      }
    } else if (mode == 'comment') {
      const groupID = await AsyncStorage.getItem('groupID');
      const c = await API.createComment(postID, textContent, groupID, replyID);
      if (!c?.message) {
        navigation.goBack();
      }
    }
  };
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`New ${mode}`} />
        <Appbar.Action
          icon="send"
          onPress={createPostOrComment}
          disabled={textContent.length < 1}
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
          <TouchableRipple
            onPress={() => alert('This feature is coming soon!')}
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
              <Icon source="image-plus" size={32} />
              <Text style={{ marginTop: 10 }}>Add image</Text>
            </View>
          </TouchableRipple>
        </View>
      </View>
      <Snackbar visible={error} onDismiss={() => setError(false)}>
        Sorry, there was an error creating this {mode}.
      </Snackbar>
    </View>
  );
}

export default WriterScreen;
