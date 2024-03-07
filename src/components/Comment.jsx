import React from 'react';
import { View } from 'react-native';
import { Avatar, Card, IconButton, Text, useTheme } from 'react-native-paper';
import timesago from 'timesago';
import { AppContext } from '../App';
import * as API from '../utils/sidechatAPI';
import AutoImage from './AutoImage';

const BORDER_RADIUS = 10;

function Comment({ comment, nav }) {
  const appState = React.useContext(AppContext);
  const { colors } = useTheme();
  const [vote, setVote] = React.useState(comment.vote_status);
  const [voteCount, setVoteCount] = React.useState(comment.vote_total);
  const [width, setWidth] = React.useState();

  const upvote = () => {
    const action = vote == 'upvote' ? 'none' : 'upvote';
    API.setVote(comment.id, appState.userToken, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  };

  const downvote = () => {
    const action = vote == 'downvote' ? 'none' : 'downvote';
    API.setVote(comment.id, appState.userToken, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  };

  return (
    <Card
      style={{
        marginLeft: comment.reply_post_id != comment.parent_post_id ? 20 : 0,
      }}
      onLayout={event => {
        setWidth(event.nativeEvent.layout.width);
      }}
      mode="contained">
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {comment?.identity?.conversation_icon ? (
            <Avatar.Text
              size={46}
              label={String(
                comment?.identity?.conversation_icon?.emoji || '‼️',
              )}
              color="white"
              style={{
                backgroundColor:
                  comment.identity?.conversation_icon?.secondary_color ||
                  colors.primary,
                borderRadius: BORDER_RADIUS,
              }}
            />
          ) : (
            <Avatar.Text
              size={46}
              label={
                comment.identity.name.length < 3 ? comment.identity.name : '💬'
              }
              style={{ borderRadius: BORDER_RADIUS }}
            />
          )}
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
          <Text variant="labelLarge" style={{ marginLeft: 10 }}>
            {timesago(comment.created_at)}
          </Text>
        </View>

        {comment.text.trim().length > 0 && (
          <Text variant="bodyLarge" style={{ marginTop: 10, marginBottom: 10 }}>
            {comment.text}
          </Text>
        )}

        {comment.assets.length > 0 &&
          comment.assets[0].type == 'image' &&
          width && (
            <AutoImage
              src={comment.assets[0].url}
              fitWidth={width - 35}
              token={appState.userToken}
              style={comment.text.trim().length < 1 ? { marginTop: 10 } : {}}
            />
          )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: -8,
            marginBottom: -2,
          }}>
          <IconButton
            icon="share-outline"
            onPress={() => {}}
            style={{ margin: 0 }}
            size={24}
            iconColor={colors.onSurfaceDisabled}
          />
          <IconButton
            icon="repeat-variant"
            onPress={() => {}}
            style={{ margin: 0 }}
            size={24}
            iconColor={colors.onSurfaceDisabled}
          />
          <View style={{ flexGrow: 1 }}></View>
          <IconButton
            icon="arrow-up-thick"
            onPress={upvote}
            style={{
              margin: 0,
            }}
            size={12}
            iconColor={colors.onSurface}
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
            iconColor={colors.onSurface}
            containerColor={
              vote == 'downvote' ? colors.onError : colors.surfaceDisabled
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
