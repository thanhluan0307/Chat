import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from '../../../api/friends';
import type {
  FriendRequestAction,
  FriendRequestFilter,
  FriendRequests,
} from '../../../api/friends';
import { ApiError } from '../../../api/http';
import type { UserSummary } from '../../../api/users';

interface RequestsState {
  requests: FriendRequests;
  filter: FriendRequestFilter;
  status: 'loading' | 'success' | 'error';
  refreshing: boolean;
  error: string | null;
  refreshError: string | null;
  actions: Record<string, FriendRequestAction>;
  actionErrors: Record<string, string>;
  notice: { text: string; kind: 'success' | 'error' } | null;
  acceptedFriend: UserSummary | null;
}

/** Tải và xử lý lời mời, giữ người vừa được đồng ý để giao diện mời mở cuộc trò chuyện. */
export function useFriendRequests() {
  const navigation = useNavigation();
  const { control, getValues, setValue } = useForm<RequestsState>({
    defaultValues: {
      requests: { sent: [], received: [] },
      filter: 'received',
      status: 'loading',
      refreshing: false,
      error: null,
      refreshError: null,
      actions: {},
      actionErrors: {},
      notice: null,
      acceptedFriend: null,
    },
  });
  const [
    requests,
    filter,
    status,
    refreshing,
    error,
    refreshError,
    actions,
    actionErrors,
    notice,
    acceptedFriend,
  ] = useWatch({
    control,
    name: [
      'requests',
      'filter',
      'status',
      'refreshing',
      'error',
      'refreshError',
      'actions',
      'actionErrors',
      'notice',
      'acceptedFriend',
    ] as const,
  });
  const currentRequest = useRef<AbortController | null>(null);
  const actionRequests = useRef(new Map<string, AbortController>());
  useEffect(() => {
    const pending = actionRequests.current;
    return () => {
      pending.forEach(controller => controller.abort());
      pending.clear();
    };
  }, []);
  const load = useCallback(
    async (refresh = false) => {
      currentRequest.current?.abort();
      const controller = new AbortController();
      currentRequest.current = controller;
      const keepRows = refresh && getValues('status') === 'success';
      setValue('error', null);
      setValue('refreshError', null);
      setValue('refreshing', keepRows);
      if (!keepRows) setValue('status', 'loading');
      try {
        const result = await getFriendRequests(controller.signal);
        if (controller.signal.aborted || currentRequest.current !== controller)
          return;
        setValue('requests', result);
        setValue('status', 'success');
      } catch (failure) {
        if (
          axios.isCancel(failure) ||
          controller.signal.aborted ||
          currentRequest.current !== controller
        )
          return;
        const message =
          failure instanceof ApiError
            ? failure.message
            : 'Không thể tải lời mời kết bạn. Vui lòng thử lại.';
        if (keepRows) setValue('refreshError', message);
        else {
          setValue('error', message);
          setValue('status', 'error');
        }
      } finally {
        if (currentRequest.current === controller) {
          currentRequest.current = null;
          setValue('refreshing', false);
        }
      }
    },
    [getValues, setValue],
  );

  useFocusEffect(
    useCallback(() => {
      load(getValues('status') === 'success');
      return () => {
        currentRequest.current?.abort();
        currentRequest.current = null;
      };
    }, [getValues, load]),
  );

  const selectFilter = useCallback(
    (next: FriendRequestFilter) => setValue('filter', next),
    [setValue],
  );
  const respond = useCallback(
    (requestId: string, action: FriendRequestAction) => {
      const request = getValues('requests.received').find(
        item => item._id === requestId,
      );
      if (
        !request ||
        actionRequests.current.has(requestId) ||
        (action === 'accept' && !request.user)
      )
        return;
      const controller = new AbortController();
      actionRequests.current.set(requestId, controller);
      setValue('actions', { ...getValues('actions'), [requestId]: action });
      const errors = { ...getValues('actionErrors') };
      delete errors[requestId];
      setValue('actionErrors', errors);
      setValue('notice', null);
      setValue('acceptedFriend', null);
      (async () => {
        try {
          if (action === 'accept')
            await acceptFriendRequest(requestId, controller.signal);
          else await declineFriendRequest(requestId, controller.signal);
          if (
            controller.signal.aborted ||
            actionRequests.current.get(requestId) !== controller
          )
            return;
          const current = getValues('requests');
          setValue('requests', {
            ...current,
            received: current.received.filter(item => item._id !== requestId),
          });
          const name =
            request.user?.displayName.trim() ||
            request.user?.username ||
            'tài khoản đã xóa';
          setValue('notice', {
            kind: 'success',
            text:
              action === 'accept'
                ? `Đã kết bạn với ${name}.`
                : `Đã từ chối lời mời từ ${name}.`,
          });
          setValue('acceptedFriend', action === 'accept' ? request.user : null);
          if (navigation.isFocused()) load(true);
        } catch (failure) {
          if (
            controller.signal.aborted ||
            axios.isCancel(failure) ||
            actionRequests.current.get(requestId) !== controller
          )
            return;
          const message =
            failure instanceof ApiError
              ? failure.message
              : 'Không thể xử lý lời mời. Vui lòng thử lại.';
          if (
            failure instanceof ApiError &&
            [404, 409].includes(failure.status)
          ) {
            setValue('notice', { kind: 'error', text: message });
            if (navigation.isFocused()) load(true);
          } else
            setValue('actionErrors', {
              ...getValues('actionErrors'),
              [requestId]: message,
            });
        } finally {
          if (actionRequests.current.get(requestId) === controller) {
            actionRequests.current.delete(requestId);
            const pending = { ...getValues('actions') };
            delete pending[requestId];
            setValue('actions', pending);
          }
        }
      })();
    },
    [getValues, setValue, load, navigation],
  );
  return {
    requests,
    filter,
    status,
    refreshing,
    error,
    refreshError,
    actions,
    actionErrors,
    notice,
    acceptedFriend,
    respond,
    selectFilter,
    refresh: useCallback(() => {
      load(true);
    }, [load]),
    retry: useCallback(() => {
      load();
    }, [load]),
  };
}
