import React from 'react';
import { FlatList, View } from 'react-native';
import {
  Card,
  Text,
  IconButton,
  useTheme,
  SegmentedButtons,
  Button,
} from 'react-native-paper';
import ActivityItem from '../components/ActivityItem';
import Post from './Post';
import { useNavigation } from '@react-navigation/native';
import Comment from './Comment';

function UserContent({ updates }) {
  const [view, setView] = React.useState('activity');

  return (
    <View style={{ flex: 1 }}>
      <SegmentedButtons
        buttons={[
          {
            value: 'activity',
            label: 'Activity',
            showSelectedCheck: true,
          },
          {
            value: 'posts',
            label: 'Posts',
            showSelectedCheck: true,
          },
          {
            value: 'comments',
            label: 'Comments',
            showSelectedCheck: true,
          },
        ]}
        density="small"
        value={view}
        onValueChange={setView}></SegmentedButtons>
      <ItemList
        updates={updates}
        view={view}
        style={{ marginTop: 10, flex: 1 }}
      />
    </View>
  );
}

const ItemList = ({ updates, view, style }) => {
  const nav = useNavigation();
  const { colors } = useTheme();
  switch (view) {
    case 'activity': {
      return (
        <Card style={style}>
          <Card.Content
            style={{ rowGap: 8, marginTop: -16, marginBottom: -16 }}>
            <FlatList
              showsVerticalScrollIndicator={false}
              data={updates.activity_items?.items?.filter(i => !i.is_seen)}
              contentContainerStyle={{
                gap: 10,
                paddingTop: 15,
                paddingBottom: 15,
              }}
              keyExtractor={item => item.id}
              renderItem={a => (
                <ActivityItem activity={a.item} key={a.item.id} />
              )}
              ListEmptyComponent={
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <IconButton
                    icon="bell-badge"
                    size={64}
                    iconColor={colors.outline}
                  />
                  <Text style={{ marginBottom: 20, color: colors.outline }}>
                    No recent activity
                  </Text>
                </View>
              }
            />
          </Card.Content>
        </Card>
      );
    }
    case 'posts': {
      return (
        <Card style={style}>
          {updates.user_posts?.posts && updates.user_posts.posts.length > 0 ? (
            <Card.Content
              style={{ rowGap: 8, marginTop: -16, marginBottom: -16 }}>
              <FlatList
                data={updates.user_posts.posts}
                contentContainerStyle={{
                  paddingTop: 15,
                  paddingBottom: 15,
                }}
                renderItem={p => (
                  <Post
                    post={p.item}
                    nav={nav}
                    key={p.index}
                    repost={true}
                    cardMode="contained"
                  />
                )}
                windowSize={10}
              />
            </Card.Content>
          ) : (
            <Card.Content
              style={{
                alignItems: 'center',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'center',
              }}>
              <IconButton
                icon="note-remove"
                size={64}
                iconColor={colors.outline}
              />
              <Text style={{ marginBottom: 20, color: colors.outline }}>
                No posts yet
              </Text>
            </Card.Content>
          )}
        </Card>
      );
    }
    case 'comments': {
      return (
        <Card style={style}>
          {updates.user_comments?.posts &&
          updates.user_comments.posts.length > 0 ? (
            <Card.Content
              style={{ rowGap: 8, marginTop: -16, marginBottom: -16 }}>
              <FlatList
                data={updates.user_comments.posts.filter(p => {
                  return p.authored_by_user;
                })}
                contentContainerStyle={{
                  gap: 10,
                  paddingTop: 15,
                  paddingBottom: 15,
                }}
                renderItem={p => (
                  <Comment
                    comment={p.item}
                    nav={nav}
                    isolated={true}
                    key={p.index}
                  />
                )}
                windowSize={10}
              />
            </Card.Content>
          ) : (
            <Card.Content
              style={{
                alignItems: 'center',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'center',
              }}>
              <IconButton
                icon="comment-processing-outline"
                size={64}
                iconColor={colors.outline}
              />
              <Text style={{ marginBottom: 20, color: colors.outline }}>
                No comments yet
              </Text>
            </Card.Content>
          )}
        </Card>
      );
    }
  }
};

export default UserContent;
