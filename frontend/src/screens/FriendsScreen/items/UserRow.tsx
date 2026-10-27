import { useTheme } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { UserSummary } from '../../../api/users';
import { Avatar } from '../../../components/Avatar';

interface UserRowProps {
  user: UserSummary;
  onRequest: (user: UserSummary) => void;
  onReceived: () => void;
  onChat: (user: UserSummary) => void;
  openingId: string | null;
}
export function UserRow({
  user,
  onRequest,
  onReceived,
  onChat,
  openingId,
}: UserRowProps) {
  const { colors } = useTheme();
  const name = user.displayName.trim() || user.username;
  const status = user.friendshipStatus ?? 'none';
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
        {status === 'received' ? (
          <Text style={[styles.username, { color: colors.primary }]}>
            Đã nhận lời mời
          </Text>
        ) : null}
        {status === 'friends' ? (
          <Text
            accessibilityLabel={`Đã là bạn bè với ${name}`}
            style={[styles.badge, { color: colors.primary }]}
          >
            Bạn bè
          </Text>
        ) : null}
      </View>
      {status === 'none' || status === 'received' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            status === 'received'
              ? `Xem lời mời từ ${name}`
              : `Kết bạn với ${name}`
          }
          onPress={() =>
            status === 'received' ? onReceived() : onRequest(user)
          }
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonLabel}>
            {status === 'received' ? 'Xem lời mời' : 'Kết bạn'}
          </Text>
        </Pressable>
      ) : status === 'friends' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Nhắn tin với ${name}`}
          accessibilityState={{
            disabled: !!openingId,
            busy: openingId === user._id,
          }}
          disabled={!!openingId}
          onPress={() => onChat(user)}
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            !!openingId && styles.pressed,
          ]}
        >
          {openingId === user._id ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonLabel}>Nhắn tin</Text>
          )}
        </Pressable>
      ) : (
        <Text
          accessibilityLabel={`Đã gửi lời mời cho ${name}`}
          style={[styles.badge, { color: colors.primary }]}
        >
          Đã gửi
        </Text>
      )}
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
  button: {
    minHeight: 44,
    minWidth: 88,
    maxWidth: 110,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: { opacity: 0.75 },
  badge: { fontSize: 13, fontWeight: '600', maxWidth: 100 },
});
