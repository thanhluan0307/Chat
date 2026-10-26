import { useTheme } from '@react-navigation/native';
import { useCallback } from 'react';
import { Controller } from 'react-hook-form';
import { Search } from '../../components/icons';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import type { UserSummary } from '../../api/users';
import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { UserRow } from './items/UserRow';
import { UsersStateView } from './items/UsersStateView';
import { useUsers } from './modules/useUsers';
import { useSendFriendRequest } from './modules/useSendFriendRequest';
import { FriendRequestComposer } from './items/FriendRequestComposer';
import type { TabScreenProps } from '../../navigation/types';
import { RouteName } from '../../navigation/routes';

export function FriendsScreen({ navigation }: TabScreenProps<'Friends'>) {
  const { colors } = useTheme();
  const {
    control,
    search,
    changeSearch,
    submitSearch,
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
    markRequestSent,
  } = useUsers();
  const composer = useSendFriendRequest(markRequestSent, refresh);
  const showReceived = useCallback(
    () => navigation.navigate(RouteName.Notifications, { filter: 'received' }),
    [navigation],
  );
  const renderItem = useCallback<ListRenderItem<UserSummary>>(
    ({ item }) => (
      <UserRow
        user={item}
        onRequest={composer.open}
        onReceived={showReceived}
      />
    ),
    [composer.open, showReceived],
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
            ? `${pagination.total} ${
                search.trim() ? 'kết quả tìm kiếm' : 'người dùng trong ChatApp'
              }`
            : 'Kết nối với mọi người trong ChatApp.'}
        </Text>
        <View
          style={[
            styles.search,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Search size={20} color={colors.text} />
          <Controller
            control={control}
            name="search"
            render={({ field: { value, onBlur } }) => (
              <TextInput
                accessibilityLabel="Tìm bạn"
                placeholder="Tìm theo tên hoặc username"
                placeholderTextColor={colors.text + '80'}
                value={value}
                onChangeText={changeSearch}
                onBlur={onBlur}
                onSubmitEditing={submitSearch}
                maxLength={100}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
                style={[styles.searchInput, { color: colors.text }]}
              />
            )}
          />
        </View>
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
          ListEmptyComponent={
            <UsersStateView kind="empty" searching={!!search.trim()} />
          }
          ListFooterComponent={footer}
          refreshing={refreshing}
          onRefresh={refresh}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          alwaysBounceVertical
          onEndReached={() => {
            if (!moreError) loadMore();
          }}
          onEndReachedThreshold={0.3}
        />
      )}
      <FriendRequestComposer {...composer} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { padding: 24, gap: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minHeight: 46, fontSize: 15 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, opacity: 0.6 },
  list: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  footer: { padding: 12, gap: 12 },
  error: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  end: { fontSize: 13, textAlign: 'center', opacity: 0.6 },
});
