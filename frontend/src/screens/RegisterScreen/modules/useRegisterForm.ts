import { Keyboard } from 'react-native';
import { useForm } from 'react-hook-form';
import { signUp } from '../../../api/auth';
import type { SignUpRequest } from '../../../api/auth';
import { ApiError } from '../../../api/http';

export interface RegisterFormValues extends SignUpRequest {
  confirmPassword: string;
}

/** Manage signup validation, submission and server errors without storing credentials globally. */
export function useRegisterForm(onRegistered: (username: string) => void) {
  const form = useForm<RegisterFormValues>({
    defaultValues: {
      lastName: '',
      firstName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });
  const submit = form.handleSubmit(async values => {
    Keyboard.dismiss();
    form.clearErrors('root');
    const username = values.username.trim().toLowerCase();
    try {
      await signUp({
        username,
        password: values.password,
        email: values.email.trim().toLowerCase(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      });
      form.reset();
      onRegistered(username);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        form.setError(
          'username',
          { type: 'server', message: error.message },
          { shouldFocus: true },
        );
      } else {
        form.setError('root.server', {
          type: 'server',
          message:
            error instanceof ApiError
              ? error.message
              : 'Đăng ký thất bại. Vui lòng thử lại.',
        });
      }
    }
  });
  return { form, submit };
}
