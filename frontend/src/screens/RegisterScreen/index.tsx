import { useTheme } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useCallback } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppButton } from '../../components/AppButton';
import { FormTextInput } from '../../components/FormTextInput';
import { Screen } from '../../components/Screen';
import { RouteName } from '../../navigation/routes';
import type { RootScreenProps } from '../../navigation/types';
import { useRegisterForm } from './modules/useRegisterForm';

export function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const onRegistered = useCallback(
    (username: string) => {
      // Ignore completion if the user left this screen while the request was running.
      if (navigation.isFocused())
        navigation.popTo(RouteName.Login, { registeredUsername: username });
    },
    [navigation],
  );
  const { form, submit } = useRegisterForm(onRegistered);
  const { isSubmitting, errors } = form.formState;

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.brand}>
            <Image
              source={require('../../../assets/app-icon/icon-1024.png')}
              style={styles.logo}
              accessibilityLabel="Logo ChatApp"
            />
            <Text style={[styles.title, { color: colors.text }]}>
              Tạo tài khoản mới
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Bắt đầu những kết nối ý nghĩa cùng ChatApp.
            </Text>
          </View>
          <View style={styles.form}>
            <FormTextInput
              control={form.control}
              name="lastName"
              label="Họ và tên đệm"
              placeholder="Nguyễn Thanh"
              rules={{
                validate: value =>
                  Boolean(value.trim()) || 'Vui lòng nhập họ và tên đệm.',
              }}
              textContentType="familyName"
              autoComplete="family-name"
              autoCapitalize="words"
              editable={!isSubmitting}
              returnKeyType="next"
              onSubmitEditing={() => form.setFocus('firstName')}
            />
            <FormTextInput
              control={form.control}
              name="firstName"
              label="Tên"
              placeholder="Luân"
              rules={{
                validate: value =>
                  Boolean(value.trim()) || 'Vui lòng nhập tên.',
              }}
              textContentType="givenName"
              autoComplete="given-name"
              autoCapitalize="words"
              editable={!isSubmitting}
              returnKeyType="next"
              onSubmitEditing={() => form.setFocus('username')}
            />
            <FormTextInput
              control={form.control}
              name="username"
              label="Tên đăng nhập"
              placeholder="Chọn tên đăng nhập"
              rules={{
                validate: {
                  required: value =>
                    Boolean(value.trim()) || 'Vui lòng nhập tên đăng nhập.',
                  noSpaces: value =>
                    !/\s/.test(value.trim()) ||
                    'Tên đăng nhập không được chứa khoảng trắng.',
                },
              }}
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="username-new"
              textContentType="username"
              editable={!isSubmitting}
              returnKeyType="next"
              onSubmitEditing={() => form.setFocus('email')}
            />
            <FormTextInput
              control={form.control}
              name="email"
              label="Email"
              placeholder="ban@example.com"
              rules={{
                validate: {
                  required: value =>
                    Boolean(value.trim()) || 'Vui lòng nhập email.',
                  format: value =>
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
                    'Email không hợp lệ.',
                },
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!isSubmitting}
              returnKeyType="next"
              onSubmitEditing={() => form.setFocus('password')}
            />
            <FormTextInput
              control={form.control}
              name="password"
              label="Mật khẩu"
              placeholder="Tối thiểu 8 ký tự"
              rules={{
                required: 'Vui lòng nhập mật khẩu.',
                minLength: {
                  value: 8,
                  message: 'Mật khẩu cần ít nhất 8 ký tự.',
                },
                deps: 'confirmPassword',
              }}
              secureTextEntry
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isSubmitting}
              returnKeyType="next"
              onSubmitEditing={() => form.setFocus('confirmPassword')}
            />
            <FormTextInput
              control={form.control}
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu"
              rules={{
                required: 'Vui lòng xác nhận mật khẩu.',
                validate: (value, values) =>
                  value === values.password || 'Mật khẩu xác nhận không khớp.',
              }}
              secureTextEntry
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isSubmitting}
              returnKeyType="done"
              onSubmitEditing={() => submit()}
            />
            {errors.root?.server?.message ? (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: colors.notification }]}
              >
                {errors.root.server.message}
              </Text>
            ) : null}
            <AppButton
              title="Đăng ký"
              onPress={submit}
              loading={isSubmitting}
            />
            <AppButton
              title="Đã có tài khoản? Đăng nhập"
              onPress={() => navigation.popTo(RouteName.Login)}
              secondary
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 28, gap: 28 },
  brand: { alignItems: 'center', gap: 12 },
  logo: { width: 64, height: 64, borderRadius: 20 },
  title: {
    fontSize: 27,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, lineHeight: 23, textAlign: 'center', opacity: 0.6 },
  form: { gap: 18 },
  error: { fontSize: 14, lineHeight: 21 },
});
