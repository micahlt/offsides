import React from 'react';
import { Image, View } from 'react-native';
import { Avatar, Card, IconButton, Text, useTheme } from 'react-native-paper';
import timesago from 'timesago';
import { AppContext } from '../App';
import * as API from '../utils/sidechatAPI';
import AutoImage from './AutoImage';

const BORDER_RADIUS = 10;

function Post({ post, nav }) {
  const appState = React.useContext(AppContext);
  const { colors } = useTheme();
  const [vote, setVote] = React.useState(post.vote_status);
  const [voteCount, setVoteCount] = React.useState(post.vote_total);
  const [width, setWidth] = React.useState();

  if (post.assets) {
    console.log(post.assets);
  }

  const upvote = () => {
    const action = vote == 'upvote' ? 'none' : 'upvote';
    API.setVote(post.id, appState.userToken, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  };

  const downvote = () => {
    const action = vote == 'downvote' ? 'none' : 'downvote';
    API.setVote(post.id, appState.userToken, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  };

  return (
    <Card
      onLayout={event => {
        setWidth(event.nativeEvent.layout.width);
      }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {post?.identity?.conversation_icon ? (
            <Avatar.Text
              size={46}
              label={String(post?.identity?.conversation_icon?.emoji || '‼️')}
              color="white"
              style={{
                backgroundColor:
                  post.identity?.conversation_icon?.color || colors.primary,
                borderRadius: BORDER_RADIUS,
              }}
            />
          ) : (
            <Avatar.Icon
              size={46}
              icon="account"
              style={{ borderRadius: BORDER_RADIUS }}
            />
          )}
          <Text variant="labelLarge" style={{ marginLeft: 10 }}>
            {timesago(post.created_at)}
          </Text>
        </View>

        {post.text.trim().length > 0 && (
          <Text variant="bodyLarge" style={{ marginTop: 10, marginBottom: 10 }}>
            {post.text}
          </Text>
        )}

        {post.assets.length > 0 && post.assets[0].type == 'image' && width && (
          <AutoImage
            src={post.assets[0].url}
            fitWidth={width - 35}
            token={appState.userToken}
            style={post.text.trim().length < 1 ? { marginTop: 10 } : {}}
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
            icon="message-outline"
            onPress={() => {}}
            style={{ margin: 0 }}
            size={20}
            iconColor={colors.onSurfaceDisabled}
          />
          <Text variant="titleMedium" style={{ marginRight: 10 }}>
            {post.comment_count}
          </Text>
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
              borderRadius: BORDER_RADIUS,
              borderColor: colors.onSurfaceDisabled,
              borderWidth: 2,
            }}
            size={20}
            iconColor={colors.onSurface}
            containerColor={vote == 'upvote' ? colors.inversePrimary : null}
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
              borderRadius: BORDER_RADIUS,
              borderColor: colors.onSurfaceDisabled,
              borderWidth: 2,
            }}
            size={20}
            iconColor={colors.onSurface}
            containerColor={vote == 'downvote' ? colors.errorContainer : null}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

export default Post;

const obj = {
  index: 0,
  item: {
    alias: 'Anonymous',
    assets: [[Object]],
    attachments: [],
    authored_by_user: false,
    comment_count: 0,
    comments_disabled: false,
    created_at: '2024-03-05T21:14:58.575Z',
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
    id: '900a353f-52bc-4595-a58b-84f4c13b560c',
    identity: {
      conversation_icon: [Object],
      name: 'Anonymous',
      posted_with_username: false,
    },
    is_saved: false,
    pinned: false,
    tags: [],
    text: 'Me after my day of doing nothing all day',
    type: 'post',
    vote_status: 'none',
    vote_total: 31,
  },
  separators: {
    highlight: [Function],
    unhighlight: [Function],
    updateProps: [Function],
  },
};
