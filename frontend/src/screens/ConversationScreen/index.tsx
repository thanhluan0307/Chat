import { useTheme } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { ArrowUp } from '../../components/icons';
import { useCallback } from 'react';
import { Controller } from 'react-hook-form';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import type { ChatMessage } from '../../api/messages';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import type { RootScreenProps } from '../../navigation/types';
import { useSession } from '../../providers/SessionProvider';
import { useMessages } from './modules/useMessages';

/** Hiển thị phòng thật từ route, tải lịch sử và gửi tin bằng API; RHF quản lý nội dung nhập. */
export function ConversationScreen({ route }: RootScreenProps<'Conversation'>) {
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const { session } = useSession();
  const {
    control,
    messages,
    draft,
    status,
    error,
    sending,
    sendError,
    refreshing,
    refresh,
    send,
  } = useMessages(route.params);
  const title = route.params.title || 'Cuộc trò chuyện';
  const canSend =
    status === 'success' &&
    !!draft.trim() &&
    !sending &&
    (route.params.type === 'group' || !!route.params.recipientId);
  const renderItem = useCallback<ListRenderItem<ChatMessage>>(
    ({ item }) => {
      const outgoing = item.senderId === session?.user._id;
      return (
        <View
          style={[
            styles.message,
            outgoing ? styles.outgoing : styles.incoming,
            { backgroundColor: outgoing ? colors.primary : colors.card },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: colors.text },
              outgoing && styles.onPrimary,
            ]}
          >
            {item.content || '[Tin nhắn không có văn bản]'}
          </Text>
          <Text
            style={[
              styles.time,
              { color: colors.text },
              outgoing && styles.onPrimary,
            ]}
          >
            {new Date(item.createdAt).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      );
    },
    [colors, session?.user._id],
  );
  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {status === 'loading' ? (
          <View style={styles.state}>
            <ActivityIndicator
              accessibilityLabel="Đang tải tin nhắn"
              color={colors.primary}
            />
          </View>
        ) : status === 'error' ? (
          <View style={styles.state}>
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              Không tải được tin nhắn
            </Text>
            <Text
              accessibilityRole="alert"
              style={[styles.description, { color: colors.notification }]}
            >
              {error}
            </Text>
            <AppButton
              title="Thử tải tin nhắn lại"
              onPress={refresh}
              secondary
            />
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.errorBanner}>
                <Text
                  accessibilityRole="alert"
                  style={{ color: colors.notification }}
                >
                  {error}
                </Text>
                <AppButton
                  title="Thử làm mới"
                  onPress={refresh}
                  loading={refreshing}
                  secondary
                />
              </View>
            ) : null}
            <FlatList
              testID="messages-list"
              inverted={messages.length > 0}
              data={messages}
              keyExtractor={item => item._id}
              renderItem={renderItem}
              contentContainerStyle={[
                styles.messages,
                !messages.length && styles.emptyList,
              ]}
              refreshing={refreshing}
              onRefresh={refresh}
              alwaysBounceVertical
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Avatar name={title} large />
                  <Text style={[styles.stateTitle, { color: colors.text }]}>
                    Chưa có tin nhắn
                  </Text>
                  <Text style={[styles.description, { color: colors.text }]}>
                    Gửi lời chào để bắt đầu cuộc trò chuyện với {title}.
                  </Text>
                </View>
              }
            />
          </>
        )}
        {sendError ? (
          <Text
            accessibilityRole="alert"
            style={[styles.sendError, { color: colors.notification }]}
          >
            {sendError}
          </Text>
        ) : null}
        <View
          style={[
            styles.composer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Controller
            control={control}
            name="draft"
            render={({ field }) => (
              <TextInput
                ref={field.ref}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!sending && status === 'success'}
                maxLength={4000}
                multiline
                placeholder="Nhắn một lời..."
                placeholderTextColor={colors.text + '80'}
                accessibilityLabel="Nội dung tin nhắn"
                style={[styles.input, { color: colors.text }]}
              />
            )}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gửi tin nhắn"
            accessibilityState={{ disabled: !canSend, busy: sending }}
            disabled={!canSend}
            onPress={send}
            style={[
              styles.send,
              { backgroundColor: colors.primary },
              !canSend && styles.disabledSend,
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ArrowUp size={22} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  onPrimary: { color: '#FFFFFF' },
  disabledSend: { opacity: 0.4 },
  messages: { padding: 20, gap: 12 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 16, paddingHorizontal: 20 },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  stateTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  description: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorBanner: { padding: 16, gap: 10 },
  sendError: { paddingHorizontal: 20, paddingVertical: 10, fontSize: 14 },
  message: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 6,
  },
  outgoing: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  incoming: { alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  messageText: { fontSize: 16, lineHeight: 23 },
  time: { fontSize: 10, opacity: 0.65, alignSelf: 'flex-end' },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
