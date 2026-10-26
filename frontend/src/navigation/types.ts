import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RouteName } from './routes';
import type { FriendRequestFilter } from '../api/friends';

export type MainTabParamList = {
  [RouteName.Chats]: undefined;
  [RouteName.Friends]: undefined;
  [RouteName.Notifications]: { filter?: FriendRequestFilter } | undefined;
  [RouteName.Profile]: undefined;
};
export type RootStackParamList = {
  [RouteName.Login]: { registeredUsername?: string } | undefined;
  [RouteName.Register]: undefined;
  [RouteName.MainTabs]: NavigatorScreenParams<MainTabParamList> | undefined;
  [RouteName.Conversation]: { conversationId: string };
};
export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
export type TabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
