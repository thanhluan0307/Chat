import { useTheme } from '@react-navigation/native';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}
export function AppButton({
  title,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
}: AppButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.card : colors.primary,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.text : '#FFFFFF'} />
      ) : (
        <Text
          style={[
            styles.title,
            { color: colors.text },
            !secondary && styles.onPrimary,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '600' },
  onPrimary: { color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
});
