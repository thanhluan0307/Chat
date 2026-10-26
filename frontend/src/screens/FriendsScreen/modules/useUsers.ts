import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { getUsers } from '../../../api/users';
import type { UserSummary, UsersPagination } from '../../../api/users';
import { ApiError } from '../../../api/http';

interface UsersState {
  users: UserSummary[];
  pagination: UsersPagination | null;
  status: 'loading' | 'success' | 'error';
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  moreError: string | null;
}
type LoadMode = 'initial' | 'refresh' | 'more';

/** Load directory pages with RHF state, request deduplication and focus cleanup. */
export function useUsers() {
  const { control, getValues, setValue } = useForm<UsersState>({
    defaultValues: {
      users: [],
      pagination: null,
      status: 'loading',
      refreshing: false,
      loadingMore: false,
      error: null,
      moreError: null,
    },
  });
  const [users, pagination, status, refreshing, loadingMore, error, moreError] =
    useWatch({
      control,
      name: [
        'users',
        'pagination',
        'status',
        'refreshing',
        'loadingMore',
        'error',
        'moreError',
      ] as const,
    });
  const currentRequest = useRef<AbortController | null>(null);
  const load = useCallback(
    async (page: number, mode: LoadMode) => {
      // Pagination shares a synchronous request gate so repeated scroll events cannot skip pages.
      if (mode === 'more' && currentRequest.current) return;
      currentRequest.current?.abort();
      const controller = new AbortController();
      currentRequest.current = controller;
      setValue('error', null);
      setValue('moreError', null);
      setValue('loadingMore', mode === 'more');
      setValue('refreshing', mode === 'refresh');
      if (mode === 'initial' || getValues('users').length === 0)
        setValue('status', 'loading');
      try {
        const result = await getUsers({ page, limit: 20 }, controller.signal);
        if (controller.signal.aborted || currentRequest.current !== controller)
          return;
        const previous = mode === 'more' ? getValues('users') : [];
        const mergedUsers = new Map(previous.map(user => [user._id, user]));
        result.users.forEach(user => mergedUsers.set(user._id, user));
        setValue('users', Array.from(mergedUsers.values()));
        setValue('pagination', result.pagination);
        setValue('status', 'success');
      } catch (failure: unknown) {
        if (
          axios.isCancel(failure) ||
          controller.signal.aborted ||
          currentRequest.current !== controller
        )
          return;
        const message =
          failure instanceof ApiError
            ? failure.message
            : 'Không thể tải người dùng. Vui lòng thử lại.';
        if (mode === 'more') setValue('moreError', message);
        else {
          setValue('error', message);
          setValue('status', 'error');
        }
      } finally {
        if (currentRequest.current === controller) {
          currentRequest.current = null;
          setValue('loadingMore', false);
          setValue('refreshing', false);
        }
      }
    },
    [getValues, setValue],
  );

  useFocusEffect(
    useCallback(() => {
      // Refresh page one on focus; cancel any page request on blur or unmount.
      load(1, getValues('users').length > 0 ? 'refresh' : 'initial');
      return () => {
        currentRequest.current?.abort();
        currentRequest.current = null;
      };
    }, [getValues, load]),
  );

  const refresh = useCallback(() => {
    load(1, 'refresh');
  }, [load]);
  const retry = useCallback(() => {
    load(1, 'initial');
  }, [load]);
  const loadMore = useCallback(() => {
    const currentPagination = getValues('pagination');
    if (currentPagination?.hasNextPage && !currentRequest.current)
      load(currentPagination.page + 1, 'more');
  }, [getValues, load]);

  return {
    users,
    pagination,
    status,
    refreshing,
    loadingMore,
    error,
    moreError,
    refresh,
    retry,
    loadMore,
  };
}
