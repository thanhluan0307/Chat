import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSession } from '../providers/SessionProvider';
import { ConversationScreen } from '../screens/ConversationScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { RouteName } from './routes';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
export function RootNavigator() {
  const { colors } = useTheme();
  const { session, isRestoring, restoreError, restore } = useSession();
  if (isRestoring || restoreError)
    return (
      <View style={styles.loading}>
        {restoreError ? (
          <>
            <Text accessibilityRole="alert" style={{ color: colors.text }}>
              {restoreError}
            </Text>
            <AppButton title="Thử lại" onPress={restore} />
          </>
        ) : (
          <ActivityIndicator
            accessibilityLabel="Đang khôi phục phiên đăng nhập"
            size="large"
            color={colors.primary}
          />
        )}
      </View>
    );
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
              title: route.params.title ?? 'Cuộc trò chuyện',
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
});
