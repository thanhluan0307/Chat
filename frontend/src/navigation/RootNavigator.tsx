import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { conversations } from '../data/conversations';
import { useSession } from '../providers/SessionProvider';
import { ConversationScreen } from '../screens/ConversationScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { RouteName } from './routes';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
export function RootNavigator() {
  const { session } = useSession();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      {session ? (
        <Stack.Group navigationKey="signed-in">
          <Stack.Screen
            name={RouteName.MainTabs}
            component={BottomTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={RouteName.Conversation}
            component={ConversationScreen}
            options={({ route }) => ({
              title:
                conversations.find(
                  item => item.id === route.params.conversationId,
                )?.name ?? 'Cuộc trò chuyện',
            })}
          />
        </Stack.Group>
      ) : (
        <Stack.Group navigationKey="signed-out">
          <Stack.Screen
            name={RouteName.Login}
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={RouteName.Register}
            component={RegisterScreen}
            options={{ title: 'Đăng ký' }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
