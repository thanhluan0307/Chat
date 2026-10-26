import { Keyboard } from 'react-native';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { SignInRequest } from '../../../api/auth';
import { ApiError } from '../../../api/http';
import { useSession } from '../../../providers/SessionProvider';

/** Manage login values, validation, submission, and API feedback with React Hook Form. */
export function useLoginForm(registeredUsername?: string) {
  const { signIn } = useSession();
  const form = useForm<SignInRequest>({
    defaultValues: { username: registeredUsername ?? '', password: '' },
    mode: 'onTouched',
  });
  const { reset } = form;
  useEffect(() => {
    // Apply the registered username when returning to the existing login screen.
    // reset is stable; the route value changes only after a successful signup.
    if (registeredUsername)
      reset({ username: registeredUsername, password: '' });
  }, [registeredUsername, reset]);
  const submit = form.handleSubmit(async values => {
    Keyboard.dismiss();
    form.clearErrors('root');
    try {
      await signIn({
        username: values.username.trim().toLowerCase(),
        password: values.password,
      });
    } catch (error: unknown) {
      form.setError('root.server', {
        type: 'server',
        message:
          error instanceof ApiError
            ? error.message
            : 'Đăng nhập thất bại. Vui lòng thử lại.',
      });
    }
  });
  return { form, submit };
}
