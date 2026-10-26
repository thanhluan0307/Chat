import { useTheme } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { ArrowUp } from '../../components/icons';
import { useCallback } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
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
import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { conversations } from '../../data/conversations';
import type { Message } from '../../data/conversations';
import type { RootScreenProps } from '../../navigation/types';

interface ConversationFormValues {
  draft: string;
  messages: Message[];
}

export function ConversationScreen({
  route,
  navigation,
}: RootScreenProps<'Conversation'>) {
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const conversation = conversations.find(
    item => item.id === route.params.conversationId,
  );
  const { control, getValues, setValue, resetField } =
    useForm<ConversationFormValues>({
      defaultValues: { messages: conversation?.messages ?? [], draft: '' },
    });
  const messages = useWatch({ control, name: 'messages' });
  const draft = useWatch({ control, name: 'draft' });
  const renderItem = useCallback<ListRenderItem<Message>>(
    ({ item }) => (
      <View
        style={[
          styles.message,
          item.outgoing ? styles.outgoing : styles.incoming,
          { backgroundColor: item.outgoing ? colors.primary : colors.card },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: colors.text },
            item.outgoing && styles.onPrimary,
          ]}
        >
          {item.text}
        </Text>
        <Text
          style={[
            styles.time,
            { color: colors.text },
            item.outgoing && styles.onPrimary,
          ]}
        >
          {item.time}
        </Text>
      </View>
    ),
    [colors],
  );
  const sendMessage = () => {
    const text = getValues('draft').trim();
    if (!text) return;
    const message: Message = {
      id: `local-${Date.now()}`,
      text,
      outgoing: true,
      time: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setValue('messages', [message, ...getValues('messages')]);
    resetField('draft');
  };
  if (!conversation) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text style={{ color: colors.text }}>
            Không tìm thấy cuộc trò chuyện.
          </Text>
          <AppButton title="Quay lại" onPress={navigation.goBack} />
        </View>
      </Screen>
    );
  }
  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <FlatList
          inverted
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
        />
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
            accessibilityState={{ disabled: !draft.trim() }}
            disabled={!draft.trim()}
            onPress={sendMessage}
            style={[
              styles.send,
              {
                backgroundColor: colors.primary,
              },
              !draft.trim() && styles.disabledSend,
            ]}
          >
            <ArrowUp size={22} color="#FFFFFF" />
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
  empty: { padding: 24, gap: 24 },
});
