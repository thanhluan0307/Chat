import { useTheme } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import type { UserSummary } from '../../api/users';
import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { UserRow } from './items/UserRow';
import { UsersStateView } from './items/UsersStateView';
import { useUsers } from './modules/useUsers';

export function FriendsScreen() {
  const { colors } = useTheme();
  const {
    users,
    pagination,
    status,
    refreshing,
    loadingMore,
    error,
    moreError,
    refresh,
    retry,
    loadMore,
  } = useUsers();
  const renderItem = useCallback<ListRenderItem<UserSummary>>(
    ({ item }) => <UserRow user={item} />,
    [],
  );
  const footer =
    users.length > 0 ? (
      <View style={styles.footer}>
        {loadingMore ? (
          <ActivityIndicator
            accessibilityLabel="Đang tải thêm người dùng"
            color={colors.primary}
          />
        ) : moreError ? (
          <>
            <Text
              accessibilityRole="alert"
              style={[styles.error, { color: colors.notification }]}
            >
              {moreError}
            </Text>
            <AppButton title="Thử tải lại" onPress={loadMore} secondary />
          </>
        ) : pagination?.hasNextPage ? (
          <AppButton title="Tải thêm" onPress={loadMore} secondary />
        ) : (
          <Text style={[styles.end, { color: colors.text }]}>
            Đã hiển thị tất cả người dùng
          </Text>
        )}
      </View>
    ) : undefined;
  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>Mọi người</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {pagination
            ? `${pagination.total} người dùng trong ChatApp`
            : 'Kết nối với mọi người trong ChatApp.'}
        </Text>
      </View>
      {status === 'loading' ? (
        <UsersStateView kind="loading" />
      ) : status === 'error' ? (
        <UsersStateView kind="error" error={error} onRetry={retry} />
      ) : (
        <FlatList
          testID="users-list"
          data={users}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<UsersStateView kind="empty" />}
          ListFooterComponent={footer}
          refreshing={refreshing}
          onRefresh={refresh}
          alwaysBounceVertical
          onEndReached={() => {
            if (!moreError) loadMore();
          }}
          onEndReachedThreshold={0.3}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, opacity: 0.6 },
  list: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  footer: { padding: 12, gap: 12 },
  error: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  end: { fontSize: 13, textAlign: 'center', opacity: 0.6 },
});
