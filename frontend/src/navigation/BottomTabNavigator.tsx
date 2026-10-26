import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@react-navigation/native';
import {
  Bell,
  MessageCircle,
  UserRound,
  UsersRound,
} from '../components/icons';
import { ChatsScreen } from '../screens/ChatsScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RouteName } from './routes';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
interface TabIconProps {
  color: string;
  size: number;
  focused: boolean;
}
function ChatIcon({ color, size, focused }: TabIconProps) {
  return (
    <MessageCircle
      color={color}
      size={size}
      strokeWidth={focused ? 2.4 : 1.8}
    />
  );
}
function FriendsIcon({ color, size, focused }: TabIconProps) {
  return (
    <UsersRound color={color} size={size} strokeWidth={focused ? 2.4 : 1.8} />
  );
}
function ProfileIcon({ color, size, focused }: TabIconProps) {
  return (
    <UserRound color={color} size={size} strokeWidth={focused ? 2.4 : 1.8} />
  );
}
function NotificationsIcon({ color, size, focused }: TabIconProps) {
  return <Bell color={color} size={size} strokeWidth={focused ? 2.4 : 1.8} />;
}
export function BottomTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name={RouteName.Chats}
        component={ChatsScreen}
        options={{
          title: 'Chat',
          headerTitle: 'ChatApp',
          tabBarIcon: ChatIcon,
          tabBarButtonTestID: 'tab-chats',
          tabBarAccessibilityLabel: 'Tab Chat',
        }}
      />
      <Tab.Screen
        name={RouteName.Friends}
        component={FriendsScreen}
        options={{
          title: 'Bạn bè',
          tabBarIcon: FriendsIcon,
          tabBarButtonTestID: 'tab-friends',
          tabBarAccessibilityLabel: 'Tab Bạn bè',
        }}
      />
      <Tab.Screen
        name={RouteName.Notifications}
        component={NotificationsScreen}
        options={{
          title: 'Thông báo',
          tabBarIcon: NotificationsIcon,
          tabBarButtonTestID: 'tab-notifications',
          tabBarAccessibilityLabel: 'Tab Thông báo',
        }}
      />
      <Tab.Screen
        name={RouteName.Profile}
        component={ProfileScreen}
        options={{
          title: 'Cá nhân',
          tabBarIcon: ProfileIcon,
          tabBarButtonTestID: 'tab-profile',
          tabBarAccessibilityLabel: 'Tab Cá nhân',
        }}
      />
    </Tab.Navigator>
  );
}
