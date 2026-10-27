import { useTheme } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import type { TabScreenProps } from '../../navigation/types';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import type { FriendRequestFilter, FriendRequestItem } from '../../api/friends';
import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { FriendRequestRow } from './items/FriendRequestRow';
import { RequestsStateView } from './items/RequestsStateView';
import { useFriendRequests } from './modules/useFriendRequests';
import { useOpenConversation } from '../../hooks/useOpenConversation';

const filters: { key: FriendRequestFilter; label: string }[] = [
  { key: 'received', label: 'Đã nhận' },
  { key: 'sent', label: 'Đã gửi' },
];

export function NotificationsScreen({
  route,
  navigation,
}: TabScreenProps<'Notifications'>) {
  const { colors } = useTheme();
  const chat = useOpenConversation();
  const {
    requests,
    filter,
    status,
    refreshing,
    error,
    refreshError,
    actions,
    actionErrors,
    notice,
    acceptedFriend,
    respond,
    selectFilter,
    refresh,
    retry,
  } = useFriendRequests();
  useEffect(() => {
    if (route.params?.filter) {
      selectFilter(route.params.filter);
      navigation.setParams({ filter: undefined });
    }
  }, [route.params?.filter, navigation, selectFilter]);
  const renderItem = useCallback<ListRenderItem<FriendRequestItem>>(
    ({ item }) => (
      <FriendRequestRow
        request={item}
        direction={filter}
        action={actions[item._id]}
        error={actionErrors[item._id]}
        onRespond={respond}
      />
    ),
    [filter, actions, actionErrors, respond],
  );
  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>
          Lời mời kết bạn
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Lời mời đang chờ phản hồi.
        </Text>
        <View style={[styles.filters, { backgroundColor: colors.card }]}>
          {filters.map(item => (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={`Lời mời ${item.label.toLocaleLowerCase(
                'vi',
              )}`}
              accessibilityState={{ selected: filter === item.key }}
              onPress={() => selectFilter(item.key)}
              style={[
                styles.filter,
                filter === item.key && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: colors.text },
                  filter === item.key && styles.selectedLabel,
                ]}
              >
                {item.label} ({requests[item.key].length})
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {notice ? (
        <Text
          accessibilityRole={notice.kind === 'error' ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          style={[
            styles.notice,
            {
              color:
                notice.kind === 'error' ? colors.notification : colors.primary,
            },
          ]}
        >
          {notice.text}
        </Text>
      ) : null}
      {acceptedFriend ? (
        <View style={styles.chatAction}>
          <AppButton
            title="Nhắn tin ngay"
            accessibilityLabel={`Nhắn tin ngay với ${
              acceptedFriend.displayName || acceptedFriend.username
            }`}
            onPress={() => chat.openChat(acceptedFriend)}
            loading={!!chat.openingId}
          />
          {chat.error ? (
            <>
              <Text
                accessibilityRole="alert"
                style={[styles.errorText, { color: colors.notification }]}
              >
                {chat.error}
              </Text>
              <AppButton title="Thử mở lại" onPress={chat.retry} secondary />
            </>
          ) : null}
        </View>
      ) : null}
      {status === 'loading' ? (
        <RequestsStateView kind="loading" filter={filter} />
      ) : status === 'error' ? (
        <RequestsStateView
          kind="error"
          filter={filter}
          error={error}
          onRetry={retry}
        />
      ) : (
        <FlatList
          key={filter}
          testID="friend-requests-list"
          data={requests[filter]}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={refresh}
          alwaysBounceVertical
          ListHeaderComponent={
            refreshError ? (
              <View style={styles.refreshError}>
                <Text
                  accessibilityRole="alert"
                  style={[styles.errorText, { color: colors.notification }]}
                >
                  {refreshError}
                </Text>
                <AppButton title="Thử làm mới" secondary onPress={refresh} />
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <RequestsStateView kind="empty" filter={filter} />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { padding: 24, gap: 10 },
  chatAction: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, opacity: 0.6 },
  filters: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    marginTop: 10,
    gap: 4,
  },
  filter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 12,
  },
  filterLabel: { fontSize: 14, fontWeight: '600' },
  selectedLabel: { color: '#FFFFFF' },
  list: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  refreshError: { gap: 10, paddingBottom: 16 },
  errorText: { fontSize: 14, lineHeight: 22 },
  notice: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    fontSize: 14,
    lineHeight: 22,
  },
});
