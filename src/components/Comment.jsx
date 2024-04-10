import '../types/OffsidesTypes.js';
import React from 'react';
import { View, Alert } from 'react-native';
import { Button, Card, IconButton, Text, useTheme } from 'react-native-paper';
import timesago from 'timesago';
import { AppContext } from '../App';
import AutoImage from './AutoImage';
import UserAvatar from './UserAvatar.jsx';

const BORDER_RADIUS = 10;

/**
 * @param {{ comment: SidechatPostOrComment }} props
 * @returns
 */
function Comment({ comment, nav, isolated = false }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [vote, setVote] = React.useState(comment.vote_status);
  const [voteCount, setVoteCount] = React.useState(comment.vote_total);
  const [width, setWidth] = React.useState();

  const upvote = () => {
    const action = vote == 'upvote' ? 'none' : 'upvote';
    API.setVote(comment.id, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  };

  const downvote = () => {
    const action = vote == 'downvote' ? 'none' : 'downvote';
    API.setVote(comment.id, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  };

  const deleteComment = () => {
    Alert.alert('Are you sure?', 'This will permanently delete this comment.', [
      {
        text: 'Confirm',
        onPress: async () => {
          await API.deletePostOrComment(comment.id);
          nav.goBack();
        },
      },
      {
        text: 'Cancel',
      },
    ]);
  };

  return (
    <Card
      style={{
        marginLeft: isolated
          ? 0
          : comment.reply_post_id != comment.parent_post_id
          ? 20
          : 0,
      }}
      onLayout={event => {
        setWidth(event.nativeEvent.layout.width);
      }}
      mode="contained">
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <UserAvatar
            group={comment.group}
            conversationIcon={comment?.identity?.conversation_icon}
            numberAlias={
              !comment?.identity?.posted_with_username
                ? comment.identity.name
                : false
            }
            size={46}
            hideGroup={true}
            borderRadius={BORDER_RADIUS}
          />
          {comment.reply_comment_alias && (
            <Text
              variant="titleMedium"
              style={{
                marginLeft: 10,
                paddingRight: 10,
                color: colors.onSurfaceDisabled,
                borderRightColor: colors.surfaceVariant,
                borderRightWidth: 1,
              }}>
              ▶ {comment.reply_comment_alias}
            </Text>
          )}
          <Text variant="labelLarge" style={{ marginLeft: 10, flex: 1 }}>
            {timesago(comment.created_at)}
          </Text>
          {comment.authored_by_user && (
            <IconButton
              icon="delete"
              size={20}
              style={{ marginRight: 0 }}
              onPress={deleteComment}
            />
          )}
        </View>

        {comment.text.trim().length > 0 && (
          <Text variant="bodyLarge" style={{ marginTop: 10, marginBottom: 10 }}>
            {comment.text}
          </Text>
        )}

        {width &&
          comment.assets.map(asset => (
            <React.Fragment key={asset.id}>
              {asset.type == 'image' && (
                <AutoImage
                  src={asset.url}
                  fitWidth={width - 35}
                  srcWidth={asset.width}
                  srcHeight={asset.height}
                  token={API.userToken}
                  style={
                    comment.text.trim().length < 1
                      ? { marginTop: 10, marginBottom: 10 }
                      : { marginBottom: 10 }
                  }
                />
              )}
              {asset.type == 'video' && (
                <AutoVideo
                  fitWidth={width - 35}
                  srcWidth={asset.width}
                  srcHeight={asset.height}
                  token={API.userToken}
                  src={asset.url}
                  format={asset.content_type}
                  poster={asset.thumbnail_asset.url}
                  style={
                    comment.text.trim().length < 1
                      ? { marginTop: 10, marginBottom: 10 }
                      : { marginBottom: 10 }
                  }
                />
              )}
            </React.Fragment>
          ))}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: -8,
            marginBottom: -2,
          }}>
          {!isolated && (
            <IconButton
              icon="share-outline"
              onPress={() => {}}
              style={{ margin: 0 }}
              size={24}
              iconColor={colors.onSurfaceDisabled}
            />
          )}
          {!isolated && (
            <Button
              mode="text"
              onPress={() =>
                nav.push('Writer', {
                  mode: 'comment',
                  postID: comment.parent_post_id,
                  replyID: comment.id,
                  groupID: comment.group.id,
                })
              }>
              Reply
            </Button>
          )}
          <View style={{ flexGrow: 1 }}></View>
          <IconButton
            icon="arrow-up-thick"
            onPress={upvote}
            style={{
              margin: 0,
            }}
            size={12}
            iconColor={
              vote == 'upvote' ? colors.onPrimaryContainer : colors.onSurface
            }
            containerColor={
              vote == 'upvote' ? colors.inversePrimary : colors.surfaceDisabled
            }
          />
          <Text
            variant="titleMedium"
            style={{
              marginRight: 10,
              marginLeft: 10,
              color: voteCount <= 0 ? colors.error : colors.primary,
            }}>
            {voteCount}
          </Text>
          <IconButton
            icon="arrow-down-thick"
            onPress={downvote}
            style={{
              margin: 0,
            }}
            size={12}
            iconColor={vote == 'downvote' ? colors.onError : colors.onSurface}
            containerColor={
              vote == 'downvote' ? colors.error : colors.surfaceDisabled
            }
          />
        </View>
      </Card.Content>
    </Card>
  );
}

export default Comment;

const obj = {
  index: 0,
  item: {
    alias: 'Anonymous',
    assets: [],
    attachments: [],
    authored_by_user: false,
    comment_count: 0,
    context: '',
    created_at: '2024-03-06T05:20:40.471Z',
    destination: 'group',
    dms_disabled: false,
    follow_status: 'not_following',
    group: {
      analytics_name: 'mc',
      asset_library_visibility: 'show',
      color: '#0DD5B2',
      group_join_type: 'email_domain',
      group_visibility: 'private',
      id: 'e953e1cc-7e17-46b9-b11a-98441e4135fe',
      membership_type: 'member',
      name: 'MC',
      roles: [Array],
    },
    group_id: 'e953e1cc-7e17-46b9-b11a-98441e4135fe',
    id: '3555428a-90a8-4046-b9a9-f37eea09ab19',
    identity: { name: '#1', posted_with_username: false },
    is_saved: false,
    parent_post_id: '3f918f1b-acaf-4746-9afd-3a10b97e1c6d',
    pinned: false,
    reply_post_id: '3f918f1b-acaf-4746-9afd-3a10b97e1c6d',
    tags: [],
    text: 'Fr',
    type: 'comment',
    vote_status: 'none',
    vote_total: 1,
  },
  separators: {
    highlight: [Function],
    unhighlight: [Function],
    updateProps: [Function],
  },
};
