import { useTheme } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { UsersRound } from '../../../components/icons';

interface UsersStateViewProps {
  kind: 'loading' | 'error' | 'empty';
  error?: string | null;
  searching?: boolean;
  onRetry?: () => void;
}
export function UsersStateView({
  kind,
  error,
  onRetry,
  searching,
}: UsersStateViewProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {kind === 'loading' ? (
        <ActivityIndicator
          accessibilityLabel="Đang tải người dùng"
          size="large"
          color={colors.primary}
        />
      ) : (
        <UsersRound size={40} color={colors.primary} />
      )}
      <Text style={[styles.title, { color: colors.text }]}>
        {kind === 'loading'
          ? 'Đang tải người dùng...'
          : kind === 'error'
          ? 'Không tải được người dùng'
          : searching
          ? 'Không tìm thấy người dùng'
          : 'Chưa có người dùng khác'}
      </Text>
      {kind !== 'loading' ? (
        <Text
          accessibilityRole={kind === 'error' ? 'alert' : undefined}
          style={[styles.description, { color: colors.text }]}
        >
          {kind === 'error'
            ? error
            : searching
            ? 'Hãy thử tên hoặc username khác.'
            : 'Những người tham gia ChatApp sẽ xuất hiện tại đây.'}
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
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '600', textAlign: 'center' },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.65,
  },
});
