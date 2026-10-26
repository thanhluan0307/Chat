import { useTheme } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type {
  FriendRequestFilter,
  FriendRequestItem,
  FriendRequestAction,
} from '../../../api/friends';
import { Avatar } from '../../../components/Avatar';
import { AppButton } from '../../../components/AppButton';

interface FriendRequestRowProps {
  request: FriendRequestItem;
  direction: FriendRequestFilter;
  action?: FriendRequestAction;
  error?: string;
  onRespond: (id: string, action: FriendRequestAction) => void;
}

export function FriendRequestRow({
  request,
  direction,
  action,
  error,
  onRespond,
}: FriendRequestRowProps) {
  const { colors } = useTheme();
  const name = request.user
    ? request.user.displayName.trim() || request.user.username
    : 'Tài khoản không còn tồn tại';
  const date = new Date(request.createdAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.heading}>
        <Avatar name={name} />
        <View style={styles.person}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {name}
          </Text>
          {request.user ? (
            <Text style={[styles.secondary, { color: colors.text }]}>
              @{request.user.username}
            </Text>
          ) : null}
        </View>
      </View>
      {request.message ? (
        <Text style={[styles.message, { color: colors.text }]}>
          {request.message}
        </Text>
      ) : null}
      <Text style={[styles.secondary, { color: colors.text }]}>
        {direction === 'received' ? 'Đã nhận' : 'Đã gửi'} · {date}
      </Text>
      <Text style={[styles.pending, { color: colors.primary }]}>
        Đang chờ phản hồi
      </Text>
      {direction === 'received' ? (
        <>
          {error ? (
            <Text
              accessibilityRole="alert"
              style={[styles.message, { color: colors.notification }]}
            >
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.button}>
              <AppButton
                title="Đồng ý"
                accessibilityLabel={`Đồng ý kết bạn với ${name}`}
                disabled={!!action || !request.user}
                loading={action === 'accept'}
                onPress={() => onRespond(request._id, 'accept')}
              />
            </View>
            <View style={styles.button}>
              <AppButton
                title="Từ chối"
                accessibilityLabel={`Từ chối lời mời từ ${name}`}
                secondary
                disabled={!!action}
                loading={action === 'decline'}
                onPress={() => onRespond(request._id, 'decline')}
              />
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 20, gap: 12, marginBottom: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  person: { flex: 1, gap: 5 },
  name: { fontSize: 16, fontWeight: '600' },
  message: { fontSize: 14, lineHeight: 22 },
  secondary: { fontSize: 12, opacity: 0.6 },
  pending: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
});
