import { useTheme } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { UserSummary } from '../../../api/users';
import { Avatar } from '../../../components/Avatar';

interface UserRowProps {
  user: UserSummary;
}
export function UserRow({ user }: UserRowProps) {
  const { colors } = useTheme();
  const name = user.displayName.trim() || user.username;
  return (
    <View style={[styles.row, { backgroundColor: colors.card }]}>
      <Avatar name={name} />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text
          style={[styles.username, { color: colors.text }]}
          numberOfLines={1}
        >
          @{user.username}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  content: { flex: 1, gap: 6 },
  name: { fontSize: 16, fontWeight: '600' },
  username: { fontSize: 13, opacity: 0.6 },
});
