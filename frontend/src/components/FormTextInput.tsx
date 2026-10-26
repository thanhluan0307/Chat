import { useTheme } from '@react-navigation/native';
import { useController } from 'react-hook-form';
import type {
  Control,
  FieldPathByValue,
  FieldValues,
  UseControllerProps,
} from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

interface FormTextInputProps<T extends FieldValues>
  extends Omit<
    TextInputProps,
    'value' | 'defaultValue' | 'onChangeText' | 'onBlur'
  > {
  control: Control<T>;
  name: FieldPathByValue<T, string>;
  label: string;
  rules?: UseControllerProps<T>['rules'];
}

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  style,
  ...props
}: FormTextInputProps<T>) {
  const { colors } = useTheme();
  const { field, fieldState } = useController({ control, name, rules });
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        {...props}
        ref={field.ref}
        value={typeof field.value === 'string' ? field.value : ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        accessibilityLabel={label}
        accessibilityHint={fieldState.error?.message}
        placeholderTextColor={colors.text + '80'}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: fieldState.error ? colors.notification : colors.border,
          },
          style,
        ]}
      />
      {fieldState.error?.message ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: colors.notification }]}
        >
          {fieldState.error.message}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: { fontSize: 13, lineHeight: 19 },
});
