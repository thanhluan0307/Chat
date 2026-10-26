import { useTheme } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { FriendRequestFilter } from '../../../api/friends';
import { AppButton } from '../../../components/AppButton';
import { Bell } from '../../../components/icons';

interface RequestsStateViewProps {
  kind: 'loading' | 'error' | 'empty';
  filter: FriendRequestFilter;
  error?: string | null;
  onRetry?: () => void;
}

export function RequestsStateView({
  kind,
  filter,
  error,
  onRetry,
}: RequestsStateViewProps) {
  const { colors } = useTheme();
  const received = filter === 'received';
  return (
    <View style={styles.container}>
      {kind === 'loading' ? (
        <ActivityIndicator
          accessibilityLabel="Đang tải lời mời kết bạn"
          size="large"
          color={colors.primary}
        />
      ) : (
        <Bell size={40} color={colors.primary} />
      )}
      <Text style={[styles.title, { color: colors.text }]}>
        {kind === 'loading'
          ? 'Đang tải lời mời kết bạn...'
          : kind === 'error'
          ? 'Không tải được lời mời kết bạn'
          : received
          ? 'Chưa có lời mời đã nhận'
          : 'Chưa có lời mời đã gửi'}
      </Text>
      {kind !== 'loading' ? (
        <Text
          accessibilityRole={kind === 'error' ? 'alert' : undefined}
          style={[styles.description, { color: colors.text }]}
        >
          {kind === 'error'
            ? error
            : received
            ? 'Những lời mời kết bạn gửi đến bạn sẽ xuất hiện ở đây.'
            : 'Những lời mời kết bạn bạn đã gửi sẽ xuất hiện ở đây.'}
        </Text>
      ) : null}
      {kind === 'error' && onRetry ? (
        <AppButton title="Thử lại" onPress={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: { fontSize: 19, fontWeight: '600', textAlign: 'center' },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.65,
  },
});
