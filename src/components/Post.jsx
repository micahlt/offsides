import { SidechatPostOrComment } from 'sidechat.js/src/types/SidechatTypes.js';
import React, { useState } from 'react';
import { Alert, Linking, View, Pressable } from 'react-native';
import { setStringAsync as copyToClipboard } from 'expo-clipboard';
import timesago from 'timesago';
import AutoImage from './AutoImage';
import AutoVideo from './AutoVideo';
import UserAvatar from './UserAvatar';
import Poll from './Poll';
import { useRecyclingState } from '@shopify/flash-list';
import { Card, CardContent } from '@/reusables/ui/card';
import { Button } from '@/reusables/ui/button';
import { Text } from '@/reusables/ui/text';
import { Badge } from '@/reusables/ui/badge';
import { Icon } from '@/reusables/ui/icon';
import {
  Link as LinkIcon,
  SquarePlay as SquarePlay,
  MessageCircle,
  MessageSquare,
  Repeat,
  ArrowBigUp,
  ArrowBigDown,
  Trash2
} from 'lucide-react-native';
import { cn } from '@/lib/utils'; // Assuming this exists based on other files

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
  apiInstance = null,
}) {
  const API = apiInstance;
  if (!post || !API) {
    return <></>;
  }
  const [vote, setVote] = useRecyclingState(post.vote_status, [post]);
  const [voteCount, setVoteCount] = useRecyclingState(post.vote_total, [post]);
  const [width, setWidth] = useState();
  const [group, setGroup] = useRecyclingState(post.group, [post]);
  const [identity, setIdentity] = useRecyclingState(post?.identity, [post]);
  const postID = post.id;

  const upvote = React.useCallback(() => {
    const action = vote == 'upvote' ? 'none' : 'upvote';
    API.setVote(postID, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  }, [vote, postID, API]);

  const downvote = React.useCallback(() => {
    const action = vote == 'downvote' ? 'none' : 'downvote';
    API.setVote(postID, action).then(res => {
      setVote(action);
      setVoteCount(res.post.vote_total);
    });
  }, [vote, postID, API]);

  const deletePost = React.useCallback(() => {
    Alert.alert(
      'Are you sure?',
      'This will permanently delete this post and its associated comments.',
      [
        {
          text: 'Confirm',
          onPress: async () => {
            await API.deletePostOrComment(postID);
            nav.replace('Home');
          },
        },
        {
          text: 'Cancel',
        },
      ],
    );
  }, [postID, API]);

  const createRepost = React.useCallback(() => {
    nav.push('Writer', {
      repostID: postID,
      mode: "post",
      groupID: post.group_id,
    })
  }, [postID]);

  const MemoizedPost = React.memo(Post);

  return (
    <Card
      onLayout={(event) => {
        const newWidth = event.nativeEvent.layout.width;
        if (newWidth !== width) setWidth(newWidth);
      }}
      className={cn("w-full bg-card p-3")} // Adjusted styling for repost
    >
      <CardContent className="p-0">
        <View className="flex-row items-center mb-3">
          <UserAvatar
            group={group}
            conversationIcon={identity?.conversation_icon}
            size={repost ? 36 : 46}
            borderRadius={BORDER_RADIUS}
          />
          <View className="flex-col justify-center flex-1 ml-3">
            <Text className="text-xs text-muted-foreground">
              {timesago(post.created_at)}
            </Text>
            {post.identity.name != 'Anonymous' && (
              <Text className="text-xs text-muted-foreground opacity-75">
                @{post.identity.name}
              </Text>
            )}
          </View>
          {post.authored_by_user && (
            <Button variant="ghost" size="icon" onPress={deletePost} className="h-8 w-8">
              <Icon as={Trash2} className="text-muted-foreground size-4" />
            </Button>
          )}
        </View>

        {post.text.trim().length > 0 && (
          <Text className={cn("text-base leading-5 text-left font-normal mb-2 px-1", minimal ? "mb-0" : "")}>
            {post.text}
          </Text>
        )}

        {width && !minimal &&
          // Assets are things like images and videos
          post.assets?.map(asset => (
            <React.Fragment key={asset.id}>
              {asset.type == 'image' && (
                <View className="mb-1 rounded-md overflow-hidden">
                  <AutoImage
                    src={asset.url}
                    fitWidth={width - (repost ? 26 : 30)} // Adjust for padding
                    srcWidth={asset.width}
                    srcHeight={asset.height}
                    token={API.userToken}
                  />
                </View>
              )}
              {asset.type == 'video' && (
                <View className="mb-1 rounded-md overflow-hidden">
                  <AutoVideo
                    fitWidth={width - (repost ? 26 : 30)}
                    srcWidth={asset.width}
                    srcHeight={asset.height}
                    token={API.userToken}
                    src={asset.url}
                    format={asset.content_type}
                    poster={asset.thumbnail_asset.url}
                  />
                </View>
              )}
            </React.Fragment>
          ))}

        {width &&
          // Attachments are things like links and embeds
          post.attachments.map(att => (
            <React.Fragment key={att.id}>
              {!!att?.youtube_id ? (
                <Pressable
                  onPress={() => Linking.openURL(att.link_url)}
                  onLongPress={async () => await copyToClipboard(att.link_url)}
                  className="self-start mb-2"
                >
                  <Badge variant="secondary" className="gap-1 pl-1 pr-2 py-1">
                    <Icon as={SquarePlay} className="text-red-600 size-4" />
                    <Text>{att.title}</Text>
                  </Badge>
                </Pressable>
              ) : att.type == 'link' ? (
                <Pressable
                  onPress={() => Linking.openURL(att.link_url)}
                  onLongPress={async () => await copyToClipboard(att.link_url)}
                  className="self-start mb-2"
                >
                  <Badge variant="secondary" className="gap-1 pl-1 pr-2 py-1">
                    <Icon as={LinkIcon} className="text-blue-500 size-4" />
                    <Text>{att.display_url}</Text>
                  </Badge>
                </Pressable>
              ) : (
                <></>
              )}
            </React.Fragment>
          ))}

        {post.poll && <Poll poll={post.poll} />}

        {post.quote_post && !repost && (
          <MemoizedPost apiInstance={apiInstance} post={post.quote_post.post} nav={nav} repost={true} />
        )}

        {!minimal && !repost && (
          <View className="flex-row items-center justify-between -ml-2 -mb-2">
            <View className="flex-row items-center">
              {!commentView && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 px-2"
                  onPress={() =>
                    nav.push('Comments', {
                      postID: post.id,
                      postObj: post,
                    })
                  }
                >
                  <Icon as={MessageCircle} className="text-muted-foreground size-5" />
                  <Text className="text-muted-foreground">{post.comment_count}</Text>
                </Button>
              )}

              {!post.dms_disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() =>
                    nav.push('Thread', {
                      postID: post.id,
                      groupID: post.group_id,
                      type: 'post',
                    })
                  }
                >
                  <Icon as={MessageSquare} className="text-muted-foreground size-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onPress={createRepost}
              >
                <Icon as={Repeat} className="text-muted-foreground size-5" />
              </Button>
            </View>

            <View className="flex-row items-center bg-secondary/50 rounded-full px-0">
              <Button
                variant={vote == 'upvote' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-full"
                onPress={upvote}
              >
                <Icon
                  as={ArrowBigUp}
                  className={cn("size-6", vote == 'upvote' ? "text-primary fill-primary/20" : "text-muted-foreground")}
                />
              </Button>

              <Text className={cn("mx-1 font-bold min-w-[20px] text-center",
                vote == 'upvote' && "text-primary",
                vote == 'downvote' && "text-destructive",
                vote == 'none' && "text-muted-foreground"
              )}>
                {voteCount}
              </Text>

              <Button
                variant={vote == 'downvote' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-full"
                onPress={downvote}
              >
                <Icon
                  as={ArrowBigDown}
                  className={cn("size-6", vote == 'downvote' ? "text-destructive fill-destructive/20" : "text-muted-foreground")}
                />
              </Button>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

Post.whyDidYouRender = true;
export default React.memo(Post);
