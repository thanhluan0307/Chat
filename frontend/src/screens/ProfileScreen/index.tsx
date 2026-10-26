import { useTheme } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import { useSession } from '../../providers/SessionProvider';

export function ProfileScreen() {
  const { colors } = useTheme();
  const { session, signOut, isSigningOut, signOutError } = useSession();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <Avatar name={session?.user.displayName ?? 'ChatApp'} large />
          <Text style={[styles.name, { color: colors.text }]}>
            {session?.user.displayName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {session?.user.email}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Chào mừng bạn đến với ChatApp
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            Trò chuyện, tìm bạn và tận hưởng những kết nối mỗi ngày.
          </Text>
        </View>
        {signOutError ? (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.notification }}
          >
            {signOutError}
          </Text>
        ) : null}
        <AppButton
          title="Đăng xuất"
          onPress={signOut}
          loading={isSigningOut}
          secondary
        />
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { padding: 24, gap: 24 },
  profile: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  name: { fontSize: 25, fontWeight: '700' },
  subtitle: { fontSize: 14, opacity: 0.55 },
  card: { padding: 22, borderRadius: 20, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  description: { fontSize: 14, lineHeight: 23, opacity: 0.6 },
});
