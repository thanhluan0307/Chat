import { useTheme } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { MessageCircle } from '../../../components/icons';

interface ChatListStateProps {
  kind: 'loading' | 'error' | 'empty' | 'search';
  error?: string | null;
  onRetry?: () => void;
}

export function ChatListState({ kind, error, onRetry }: ChatListStateProps) {
  const { colors } = useTheme();
  if (kind === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          accessibilityLabel="Đang tải cuộc trò chuyện"
          size="large"
          color={colors.primary}
        />
        <Text style={[styles.description, { color: colors.text }]}>
          Đang tải cuộc trò chuyện...
        </Text>
      </View>
    );
  }
  const title =
    kind === 'error'
      ? 'Không tải được cuộc trò chuyện'
      : kind === 'empty'
      ? 'Chưa có cuộc trò chuyện'
      : 'Không tìm thấy cuộc trò chuyện.';
  const description =
    kind === 'error'
      ? error
      : kind === 'empty'
      ? 'Những cuộc trò chuyện của bạn sẽ xuất hiện tại đây.'
      : 'Thử tìm kiếm bằng một tên khác.';
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: colors.card }]}>
        <MessageCircle size={36} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text
        accessibilityRole={kind === 'error' ? 'alert' : undefined}
        style={[styles.description, { color: colors.text }]}
      >
        {description}
      </Text>
      {kind === 'error' && onRetry ? (
        <AppButton title="Thử lại" onPress={onRetry} />
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    gap: 16,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 19, fontWeight: '600', textAlign: 'center' },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.65,
  },
});
