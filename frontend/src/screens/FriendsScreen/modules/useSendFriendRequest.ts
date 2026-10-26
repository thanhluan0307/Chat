import { useCallback, useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import axios from 'axios';
import { sendFriendRequest } from '../../../api/friends';
import { ApiError } from '../../../api/http';
import type { UserSummary } from '../../../api/users';

export interface FriendRequestFormValues {
  recipient: UserSummary | null;
  message: string;
  error: string | null;
  sending: boolean;
  blocked: boolean;
}
const emptyForm: FriendRequestFormValues = {
  recipient: null,
  message: '',
  error: null,
  sending: false,
  blocked: false,
};

export function useSendFriendRequest(
  onSent: (id: string) => void,
  onConflict: () => void,
) {
  const { control, reset, setValue, handleSubmit } =
    useForm<FriendRequestFormValues>({ defaultValues: emptyForm });
  const [recipient, message, error, sending, blocked] = useWatch({
    control,
    name: ['recipient', 'message', 'error', 'sending', 'blocked'] as const,
  });
  const currentRequest = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      currentRequest.current?.abort();
    },
    [],
  );
  const open = useCallback(
    (user: UserSummary) => {
      if (!currentRequest.current) reset({ ...emptyForm, recipient: user });
    },
    [reset],
  );
  const cancel = useCallback(() => {
    if (!currentRequest.current) reset(emptyForm);
  }, [reset]);
  const submit = useCallback(() => {
    handleSubmit(async values => {
      if (!values.recipient || values.blocked || currentRequest.current) return;
      const controller = new AbortController();
      currentRequest.current = controller;
      setValue('sending', true);
      setValue('error', null);
      try {
        await sendFriendRequest(
          { to: values.recipient._id, message: values.message },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        onSent(values.recipient._id);
        reset(emptyForm);
      } catch (failure) {
        if (controller.signal.aborted || axios.isCancel(failure)) return;
        setValue(
          'error',
          failure instanceof ApiError
            ? failure.message
            : 'Không thể gửi lời mời. Vui lòng thử lại.',
        );
        if (failure instanceof ApiError && failure.status === 409) {
          setValue('blocked', true);
          onConflict();
        }
      } finally {
        if (currentRequest.current === controller) {
          currentRequest.current = null;
          if (!controller.signal.aborted) setValue('sending', false);
        }
      }
    })();
  }, [handleSubmit, onSent, onConflict, reset, setValue]);
  return {
    control,
    recipient,
    message,
    error,
    sending,
    blocked,
    open,
    cancel,
    submit,
  };
}
