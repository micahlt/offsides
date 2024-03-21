import React from 'react';
import { Alert, View } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';
import timesago from 'timesago';
import { AppContext } from '../App';
import AutoImage from './AutoImage';
import AutoVideo from './AutoVideo';
import UserAvatar from './UserAvatar';

const BORDER_RADIUS = 12;

function Post({
  post,
  nav,
  commentView = false,
  repost = false,
  cardMode = repost ? 'outlined' : 'elevated',
}) {
  if (!post) {
    return <></>;
  }
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [vote, setVote] = React.useState(post.vote_status);
  const [voteCount, setVoteCount] = React.useState(post.vote_total);
  const [width, setWidth] = React.useState();

  const upvote = () => {
    const action = vote == 'upvote' ? 'none' : 'upvote';
    API.setVote(post.id, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  };

  const downvote = () => {
    const action = vote == 'downvote' ? 'none' : 'downvote';
    API.setVote(post.id, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  };

  const deletePost = () => {
    Alert.alert(
      'Are you sure?',
      'This will permanently delete this post and its associated comments.',
      [
        {
          text: 'Confirm',
          onPress: async () => {
            await API.deletePostOrComment(post.id);
            nav.navigate('Home');
          },
        },
        {
          text: 'Cancel',
        },
      ],
    );
  };

  return (
    <Card
      onLayout={event => {
        setWidth(event.nativeEvent.layout.width);
      }}
      mode={cardMode}
      style={repost ? { marginBottom: 10 } : {}}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <UserAvatar
            group={post.group}
            conversationIcon={post?.identity?.conversation_icon}
            size={46}
            borderRadius={BORDER_RADIUS}
          />
          <View
            style={{
              justifyContent: 'center',
              flexDirection: 'column',
              flex: 1,
            }}>
            <Text variant="labelLarge" style={{ marginLeft: 10 }}>
              {timesago(post.created_at)}
            </Text>
            {post.identity.name != 'Anonymous' && (
              <Text
                variant="labelSmall"
                style={{ marginLeft: 10, opacity: 0.75 }}>
                @{post.identity.name}
              </Text>
            )}
          </View>
          {post.authored_by_user && (
            <IconButton
              icon="delete"
              size={20}
              style={{ marginRight: 0 }}
              onPress={deletePost}
            />
          )}
        </View>

        {post.text.trim().length > 0 && (
          <Text variant="bodyLarge" style={{ marginTop: 10, marginBottom: 10 }}>
            {post.text}
          </Text>
        )}

        {width &&
          post.assets.map(asset => (
            <React.Fragment key={asset.id}>
              {asset.type == 'image' && (
                <AutoImage
                  src={asset.url}
                  fitWidth={width - 35}
                  srcWidth={asset.width}
                  srcHeight={asset.height}
                  token={API.userToken}
                  style={
                    post.text.trim().length < 1
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
                    post.text.trim().length < 1
                      ? { marginTop: 10, marginBottom: 10 }
                      : { marginBottom: 10 }
                  }
                />
              )}
            </React.Fragment>
          ))}

        {post.quote_post && !repost && (
          <Post post={post.quote_post.post} nav={nav} repost={true} />
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: -8,
            marginBottom: -2,
          }}>
          {!commentView && (
            <>
              <IconButton
                icon="message-outline"
                onPress={() =>
                  nav.navigate('Comments', {
                    postID: post.id,
                    postObj: post,
                  })
                }
                style={{ margin: 0 }}
                size={20}
                iconColor={colors.onSurfaceDisabled}
              />
              <Text variant="titleMedium" style={{ marginRight: 10 }}>
                {post.comment_count}
              </Text>
            </>
          )}
          {!post.dms_disabled && (
            <IconButton
              icon="share-outline"
              onPress={() => alert("DM's aren't enabled yet.")}
              style={{ margin: 0 }}
              size={24}
              iconColor={colors.onSurfaceDisabled}
            />
          )}
          <IconButton
            icon="repeat-variant"
            onPress={() => alert("Reposting isn't enabled yet.")}
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
            iconColor={
              vote == 'upvote' ? colors.onPrimaryContainer : colors.onSurface
            }
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
            iconColor={vote == 'downvote' ? colors.onError : colors.onSurface}
            containerColor={vote == 'downvote' ? colors.error : null}
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
