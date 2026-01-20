import React from 'react';
import { View, StatusBar, Pressable } from 'react-native';
import AppContext from '../utils/AppContext';
import timesago from 'timesago';
import { useFocusEffect } from '@react-navigation/native';
import crashlytics from '@react-native-firebase/crashlytics';
import UserContent from '../components/UserContent';
import Header from '../components/Header';
import { useMMKVObject } from 'react-native-mmkv';
import { needsUpdate } from '../utils';

// Reusable components
import { Card, CardContent } from '@/reusables/ui/card';
import { Button } from '@/reusables/ui/button';
import { Text } from '@/reusables/ui/text';
import { Badge } from '@/reusables/ui/badge';
import { Separator } from '@/reusables/ui/separator';
import { Progress } from '@/reusables/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/reusables/ui/avatar';
import { Icon } from '@/reusables/ui/icon';
import {
  ArrowLeft,
  MessageSquare,
  Settings,
  Pencil,
  User as UserIcon,
  Users,
  Trophy,
  MessageCircle
} from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { TextClassContext } from '@/reusables/ui/text';

const BORDER_RADIUS = 15;

function MyProfileScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const [updates, setUpdates] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [updateBadge, setUpdateBadge] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');

  useFocusEffect(() => {
    crashlytics().log('Loading MyProfileScreen');
    loadProfile();
    needsUpdate().then(setUpdateBadge);
  });

  const loadProfile = async () => {
    crashlytics().log('Fetching profile');
    const u = await API.getUpdates(currentGroup?.id);
    crashlytics().log('Profile fetched successfully');
    setUpdates(u);
    setLoading(false);
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar animated={true} backgroundColor="#000000" barStyle="light-content" />

      {/* Custom Header replacing Appbar */}
      <Header
        title={updates?.user?.username ? `@${updates.user.username}` : 'Your Profile'}
        rightContent={
          <>
            <Button variant="ghost" size="icon" onPress={() => navigation.push('Messages')} className="h-10 w-10">
              <Icon size={20} as={MessageSquare} className="text-foreground" />
            </Button>

            <View>
              {updateBadge && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 z-10 px-1 py-0 h-4 min-w-[16px]"
                >
                  <Text className="text-[8px] font-bold text-white">!</Text>
                </Badge>
              )}
              <Button variant="ghost" size="icon" onPress={() => navigation.push('Settings')} className="h-10 w-10">
                <Icon size={20} as={Settings} className="text-foreground" />
              </Button>
            </View>
          </>
        }
      />

      {/* Loading Indicator */}
      {loading && (
        <Progress value={33} className="w-full h-1" />
      )}

      {updates?.user && (
        <View className="flex-1 p-4 gap-4">

          {/* Top User Info Section */}
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => navigation.push('EditProfile')}
              className="overflow-hidden rounded-xl active:opacity-80"
            >
              {updates.user?.conversation_icon ? (
                <View
                  style={{
                    backgroundColor: updates.user?.conversation_icon?.color || '#000',
                    width: 64,
                    height: 64,
                    borderRadius: BORDER_RADIUS,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text className="text-2xl text-white">
                    {updates.user?.conversation_icon?.emoji || '‼️'}
                  </Text>
                </View>
              ) : (
                <Avatar className="h-16 w-16 rounded-xl">
                  <AvatarFallback className="rounded-xl">
                    <Icon as={UserIcon} className="text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
            </Pressable>

            <View className="flex-1 gap-1">
              <Button
                variant="secondary"
                size="sm"
                onPress={() => navigation.push('EditProfile')}
                className="self-start gap-2"
              >
                <Icon as={Pencil} className="text-secondary-foreground" size={14} />
                <Text>Edit Profile</Text>
              </Button>

              <Text className="text-muted-foreground text-xs text-right mt-1">
                joined {timesago(updates.user.created_at)}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View className="flex-row gap-2">
            <Card className="flex-1 bg-card">
              <CardContent className="p-4 items-center gap-2">
                <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Followers</Text>
                <Text className="text-2xl font-bold text-primary">{updates?.user?.follower_count || '--'}</Text>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-card">
              <CardContent className="p-4 items-center gap-2">
                <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Post Karma</Text>
                <Text className="text-2xl font-bold text-primary">{updates?.karma?.post || '--'}</Text>
              </CardContent>
            </Card>
          </View>

          <View className="flex-row gap-2">
            <Card className="flex-1 bg-card">
              <CardContent className="p-4 items-center gap-2">
                <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Groups</Text>
                <Text className="text-2xl font-bold text-primary">{updates?.groups?.length || '--'}</Text>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-card">
              <CardContent className="p-4 items-center gap-2">
                <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Comment Karma</Text>
                <Text className="text-2xl font-bold text-primary">{updates?.karma?.comment || '--'}</Text>
              </CardContent>
            </Card>
          </View>

          <Separator className="my-2" />

          <UserContent updates={updates} />
        </View>
      )}
    </View>
  );
}

export default MyProfileScreen;
