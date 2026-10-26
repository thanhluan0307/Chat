import { useTheme } from '@react-navigation/native';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppButton } from '../../../components/AppButton';
import { FormTextInput } from '../../../components/FormTextInput';
import type { useSendFriendRequest } from '../modules/useSendFriendRequest';

type FriendRequestComposerProps = ReturnType<typeof useSendFriendRequest>;

export function FriendRequestComposer({
  recipient,
  control,
  message,
  error,
  sending,
  blocked,
  cancel,
  submit,
}: FriendRequestComposerProps) {
  const { colors } = useTheme();
  if (!recipient) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={cancel}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.overlay}
          keyboardShouldPersistTaps="handled"
        >
          <View
            accessibilityViewIsModal
            style={[styles.card, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Gửi lời mời kết bạn
            </Text>
            <Text style={[styles.recipient, { color: colors.text }]}>
              {recipient.displayName || recipient.username}
            </Text>
            <Text style={[styles.hint, { color: colors.text }]}>
              Bạn có thể gửi kèm một lời nhắn, tối đa 300 ký tự.
            </Text>
            <FormTextInput
              control={control}
              name="message"
              label="Lời nhắn"
              placeholder="Chào bạn, kết bạn với mình nhé!"
              multiline
              maxLength={300}
              editable={!sending}
              autoFocus
              rules={{
                maxLength: {
                  value: 300,
                  message: 'Lời nhắn không được quá 300 ký tự.',
                },
              }}
              style={styles.input}
              textAlignVertical="top"
            />
            <Text style={[styles.counter, { color: colors.text }]}>
              {message.length}/300
            </Text>
            {error ? (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: colors.notification }]}
              >
                {error}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <View style={styles.action}>
                <AppButton
                  title="Hủy"
                  secondary
                  disabled={sending}
                  onPress={cancel}
                />
              </View>
              <View style={styles.action}>
                <AppButton
                  title="Gửi lời mời"
                  loading={sending}
                  disabled={blocked}
                  onPress={submit}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  overlay: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  title: { fontSize: 21, fontWeight: '700' },
  recipient: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 20, opacity: 0.65 },
  input: { minHeight: 100 },
  counter: { fontSize: 12, textAlign: 'right', opacity: 0.6 },
  error: { fontSize: 14, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
});
