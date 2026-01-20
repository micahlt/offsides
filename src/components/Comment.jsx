import '../types/OffsidesTypes.js';
import React, { useState } from 'react';
import { View, Alert, Linking, Pressable } from 'react-native';
import { setStringAsync as copyToClipboard } from 'expo-clipboard';
import timesago from 'timesago';
import AppContext from '../utils/AppContext';
import AutoImage from './AutoImage';
import AutoVideo from './AutoVideo';
import UserAvatar from './UserAvatar.jsx';
import Poll from './Poll.jsx';
import { useRecyclingState } from '@shopify/flash-list';

import { Card, CardContent } from '@/reusables/ui/card';
import { Button } from '@/reusables/ui/button';
import { Text } from '@/reusables/ui/text';
import { Badge } from '@/reusables/ui/badge';
import { Icon } from '@/reusables/ui/icon';
import { cn } from '@/lib/utils';
import {
  Trash2,
  SquarePlay,
  Link as LinkIcon,
  MessageSquare,
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Reply
} from 'lucide-react-native';

const BORDER_RADIUS = 10;

/**
 * @param {{ comment: SidechatPostOrComment }} props
 * @returns
 */
function Comment({ comment, nav, isolated = false }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;

  const [vote, setVote] = useRecyclingState(comment.vote_status, [comment]);
  const [voteCount, setVoteCount] = useRecyclingState(comment.vote_total, [comment]);
  const [width, setWidth] = useState();

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

  const isNested = !isolated && comment.reply_post_id != comment.parent_post_id;

  return (
    <Card
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width);
      }}
      className={cn(
        "bg-card border-none py-3 px-1 shadow-none",
        isNested ? "ml-5 pl-2 border-l border-border" : ""
      )}
    >
      <CardContent className="px-2 py-0">
        {/* Header */}
        <View className="flex-row items-center mb-2">
          <UserAvatar
            group={comment.group}
            conversationIcon={comment?.identity?.conversation_icon}
            numberAlias={
              !comment?.identity?.posted_with_username
                ? comment.identity.name
                : false
            }
            size={36}
            hideGroup={true}
            borderRadius={BORDER_RADIUS}
          />

          <View className="flex-1 flex-col justify-center ml-3">
            <View className="flex-row items-center flex-wrap">
              {comment.identity.name != 'Anonymous' &&
                comment?.identity?.posted_with_username && (
                  <Text className="text-xs text-muted-foreground mr-2 font-semibold">
                    @{comment.identity.name}
                  </Text>
                )}

              {comment.reply_comment_alias && (
                <View className="flex-row items-center mr-2">
                  <Text className="text-xs text-muted-foreground opacity-50 mr-1">▶</Text>
                  <Text className="text-xs text-muted-foreground font-medium bg-muted px-1 rounded-sm">
                    {comment.reply_comment_alias}
                  </Text>
                </View>
              )}

              {!comment?.identity?.posted_with_username && (
                <Text className="text-xs text-muted-foreground">
                  {timesago(comment.created_at)}
                </Text>
              )}
            </View>

            {comment?.identity?.posted_with_username && (
              <Text className="text-xs text-muted-foreground mt-0.5">
                {timesago(comment.created_at)}
              </Text>
            )}
          </View>

          {comment.authored_by_user && (
            <Button variant="ghost" size="icon" onPress={deleteComment} className="h-8 w-8">
              <Icon as={Trash2} className="text-muted-foreground size-4" />
            </Button>
          )}
        </View>

        {/* Content */}
        {comment.text.trim().length > 0 && (
          <Text className="text-base leading-5 mb-2 text-foreground">
            {comment.text}
          </Text>
        )}

        {/* Assets */}
        {width &&
          comment.assets.map(asset => (
            <React.Fragment key={asset.id}>
              {asset.type == 'image' && (
                <View className="mb-2 rounded-md overflow-hidden">
                  <AutoImage
                    src={asset.url}
                    fitWidth={width - 24} // 24 = padding (p-3 = 12px * 2)
                    srcWidth={asset.width}
                    srcHeight={asset.height}
                    token={API.userToken}
                  />
                </View>
              )}
              {asset.type == 'video' && (
                <View className="mb-2 rounded-md overflow-hidden">
                  <AutoVideo
                    fitWidth={width - 24}
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

        {/* Attachments */}
        {width &&
          comment.attachments.map(att => (
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

        {comment?.poll && <Poll poll={comment.poll} />}

        {/* Footer actions */}
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center -ml-2">
            {!isolated && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onPress={() =>
                  nav.push('Thread', {
                    postID: comment.id,
                    type: 'comment',
                  })
                }
              >
                <Icon as={MessageSquare} className="text-muted-foreground size-5" />
              </Button>
            )}

            {isolated ? (
              <Button
                variant="ghost"
                size="sm"
                className="px-2 h-8"
                onPress={() =>
                  nav.push('Comments', {
                    postID: comment.parent_post_id,
                  })
                }
              >
                <Text className="text-muted-foreground text-xs font-semibold">View on post</Text>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 px-2 h-8"
                onPress={() => {
                  if (comment.parent_post_id == comment.reply_post_id) {
                    nav.push('Writer', {
                      mode: 'comment',
                      postID: comment.parent_post_id,
                      replyID: comment.id,
                      groupID: comment.group.id,
                    });
                  } else {
                    nav.push('Writer', {
                      mode: 'comment',
                      postID: comment.parent_post_id,
                      parentID: comment.reply_post_id,
                      replyID: comment.id,
                      groupID: comment.group.id,
                    });
                  }
                }}
              >
                <Icon as={Reply} className="text-muted-foreground size-4" />
                <Text className="text-muted-foreground text-xs font-semibold">Reply</Text>
              </Button>
            )}
          </View>

          <View className="flex-row items-center bg-secondary/50 rounded-full h-8">
            <Button
              variant={vote == 'upvote' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-8 w-8 rounded-full", vote == 'upvote' ? "bg-background shadow-xs" : "")}
              onPress={upvote}
            >
              <Icon
                as={ArrowBigUp}
                className={cn("size-5", vote == 'upvote' ? "text-primary fill-primary/20" : "text-muted-foreground")}
              />
            </Button>

            <Text className={cn("mx-1 font-bold min-w-[16px] text-center text-sm",
              vote == 'upvote' && "text-primary",
              vote == 'downvote' && "text-destructive",
              vote == 'none' && "text-muted-foreground"
            )}>
              {voteCount}
            </Text>

            <Button
              variant={vote == 'downvote' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-8 w-8 rounded-full", vote == 'downvote' ? "bg-background shadow-xs" : "")}
              onPress={downvote}
            >
              <Icon
                as={ArrowBigDown}
                className={cn("size-5", vote == 'downvote' ? "text-destructive fill-destructive/20" : "text-muted-foreground")}
              />
            </Button>
          </View>
        </View>

      </CardContent>
    </Card>
  );
}

export default Comment;
