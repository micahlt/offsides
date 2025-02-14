import { SidechatPostOrComment } from 'sidechat.js/src/types';
import React from 'react';
import { Alert, Linking, View } from 'react-native';
import { Card, Chip, IconButton, Text, useTheme } from 'react-native-paper';
import { setStringAsync as copyToClipboard } from 'expo-clipboard';
import timesago from 'timesago';
import { AppContext } from '../App';
import AutoImage from './AutoImage';
import AutoVideo from './AutoVideo';
import UserAvatar from './UserAvatar';
import Poll from './Poll';

const BORDER_RADIUS = 12;

/**
 * @param {object} props
 * @param {SidechatPostOrComment} props.post
 * @returns
 */
function Post({
  post,
  nav,
  commentView = false,
  repost = false,
  minimal = false,
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

  const upvote = React.useCallback(() => {
    const action = vote == 'upvote' ? 'none' : 'upvote';
    API.setVote(post.id, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  }, [vote, post.id]);

  const downvote = React.useCallback(() => {
    const action = vote == 'downvote' ? 'none' : 'downvote';
    API.setVote(post.id, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  }, [vote, post.id]);

  // if (post.attachments.length > 0) {
  //   post.attachments.forEach(a => {
  //     if (a.type == 'youtube') console.log(post.attachments);
  //   });
  // }

  const deletePost = React.useCallback(() => {
    Alert.alert(
      'Are you sure?',
      'This will permanently delete this post and its associated comments.',
      [
        {
          text: 'Confirm',
          onPress: async () => {
            await API.deletePostOrComment(post.id);
            nav.replace('Home');
          },
        },
        {
          text: 'Cancel',
        },
      ],
    );
  }, [post.id]);

  const createRepost = React.useCallback(() => {
    nav.push('Writer', {
      repostID: post.id,
      mode: "post",
      groupID: post.group_id,
    })
  }, [post.id]);

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
                variant="labelMedium"
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
          <Text variant="bodyLarge" style={{ marginTop: 10, marginBottom: minimal ? 0 : 10 }}>
            {post.text}
          </Text>
        )}

        {width && !minimal &&
          // Assets are things like images and videos
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

        {width &&
          // Attachments are things like links and embeds
          post.attachments.map(att => (
            <React.Fragment key={att.id}>
              {!!att?.youtube_id ? (
                <Chip
                  icon="youtube"
                  style={{
                    marginRight: 'auto',
                    marginBottom: 5,
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                  onPress={() => Linking.openURL(att.link_url)}
                  onLongPress={async () => await copyToClipboard(att.link_url)}>
                  {att.title}
                </Chip>
              ) : att.type == 'link' ? (
                <Chip
                  icon="link"
                  style={{
                    marginRight: 'auto',
                    marginBottom: 5,
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                  onPress={() => Linking.openURL(att.link_url)}
                  onLongPress={async () => await copyToClipboard(att.link_url)}>
                  {att.display_url}
                </Chip>
              ) : (
                <></>
              )}
            </React.Fragment>
          ))}

        {post.poll && <Poll poll={post.poll} />}

        {post.quote_post && !repost && (
          <Post post={post.quote_post.post} nav={nav} repost={true} />
        )}

        {!minimal && <View
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
                  nav.push('Comments', {
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
              icon="chat-outline"
              onPress={() =>
                nav.push('Thread', {
                  postID: post.id,
                  groupID: post.group_id,
                  type: 'post',
                })
              }
              style={{ margin: 0 }}
              size={24}
              iconColor={colors.onSurfaceDisabled}
            />
          )}
          <IconButton
            icon="repeat-variant"
            onPress={createRepost}
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
        </View>}
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
