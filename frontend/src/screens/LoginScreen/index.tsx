import { useTheme } from '@react-navigation/native';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { useLoginForm } from './modules/useLoginForm';

export function LoginScreen({ navigation, route }: RootScreenProps<'Login'>) {
  const { colors } = useTheme();
  const { form, submit } = useLoginForm(route.params?.registeredUsername);
  const { isSubmitting, errors } = form.formState;
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Image
              source={require('../../../assets/app-icon/icon-1024.png')}
              style={styles.logo}
              accessibilityLabel="Logo ChatApp"
            />
            <Text style={[styles.brandName, { color: colors.primary }]}>
              ChatApp
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Chào mừng trở lại
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Đăng nhập để tiếp tục những cuộc trò chuyện của bạn.
            </Text>
          </View>
          <View style={styles.form}>
            {route.params?.registeredUsername ? (
              <Text
                accessibilityRole="alert"
                style={[styles.success, { color: colors.primary }]}
              >
                Đăng ký thành công. Đăng nhập để tiếp tục.
              </Text>
            ) : null}
            <FormTextInput
              control={form.control}
              name="username"
              label="Tên đăng nhập"
              placeholder="Nhập tên đăng nhập"
              rules={{
                required: 'Vui lòng nhập tên đăng nhập.',
                validate: value =>
                  Boolean(value.trim()) || 'Vui lòng nhập tên đăng nhập.',
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              editable={!isSubmitting}
              returnKeyType="next"
              onSubmitEditing={() => form.setFocus('password')}
            />
            <FormTextInput
              control={form.control}
              name="password"
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              rules={{ required: 'Vui lòng nhập mật khẩu.' }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
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
              title="Đăng nhập"
              onPress={submit}
              loading={isSubmitting}
            />
            <View style={styles.footer}>
              <Text style={{ color: colors.text }}>Chưa có tài khoản?</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mở màn đăng ký"
                disabled={isSubmitting}
                onPress={() => navigation.navigate(RouteName.Register)}
                style={styles.link}
              >
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Đăng ký ngay
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 32 },
  brand: { alignItems: 'center', gap: 14 },
  logo: { width: 88, height: 88, borderRadius: 26 },
  brandName: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  subtitle: { fontSize: 15, lineHeight: 23, textAlign: 'center', opacity: 0.6 },
  form: { gap: 18 },
  error: { fontSize: 14, lineHeight: 21 },
  success: { fontSize: 14, lineHeight: 22 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { fontWeight: '600', fontSize: 14 },
});
