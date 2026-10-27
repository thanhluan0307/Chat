import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { getConversations } from '../../../api/conversations';
import { ApiError } from '../../../api/http';
import { useSession } from '../../../providers/SessionProvider';
import { toChatListItem } from './Chats.helpers';
import type { ChatListItem } from './Chats.helpers';
import { useSocket } from '../../../providers/SocketConnection';
import { CHAT_EVENTS, readSocketMessage } from '../../../services/chatEvents';

interface ChatsFormValues {
  search: string;
  items: ChatListItem[];
  status: 'loading' | 'success' | 'error';
  error: string | null;
  refreshing: boolean;
}

/** Tải danh sách bằng RHF, cập nhật khi có tin/phòng mới hoặc reconnect và hủy request khi rời màn. */
export function useChats() {
  const socket = useSocket();
  const { session } = useSession();
  const userId = session?.user._id;
  const { control, getValues, setValue } = useForm<ChatsFormValues>({
    defaultValues: {
      search: '',
      items: [],
      status: 'loading',
      error: null,
      refreshing: false,
    },
  });
  const search = useWatch({ control, name: 'search' });
  const items = useWatch({ control, name: 'items' });
  const status = useWatch({ control, name: 'status' });
  const error = useWatch({ control, name: 'error' });
  const refreshing = useWatch({ control, name: 'refreshing' });
  const currentRequest = useRef<AbortController | null>(null);
  const load = useCallback(
    async (refresh = false) => {
      if (!userId) return;
      currentRequest.current?.abort();
      const controller = new AbortController();
      currentRequest.current = controller;
      const hasItems = getValues('items').length > 0;
      setValue('error', null);
      setValue('refreshing', refresh);
      if (!refresh || !hasItems) setValue('status', 'loading');
      try {
        const result = await getConversations(controller.signal);
        if (controller.signal.aborted || currentRequest.current !== controller)
          return;
        setValue(
          'items',
          result.map(item => toChatListItem(item, userId)),
        );
        setValue('status', 'success');
      } catch (failure: unknown) {
        if (
          axios.isCancel(failure) ||
          controller.signal.aborted ||
          currentRequest.current !== controller
        )
          return;
        setValue(
          'error',
          failure instanceof ApiError
            ? failure.message
            : 'Không thể tải cuộc trò chuyện. Vui lòng thử lại.',
        );
        setValue('status', 'error');
      } finally {
        if (currentRequest.current === controller)
          setValue('refreshing', false);
      }
    },
    [getValues, setValue, userId],
  );

  useFocusEffect(
    useCallback(() => {
      function syncConversations() {
        load(true);
      }
      function onMessage(payload: unknown) {
        if (readSocketMessage(payload)) syncConversations();
      }
      socket?.on(CHAT_EVENTS.newMessage, onMessage);
      socket?.on(CHAT_EVENTS.conversationCreated, syncConversations);
      socket?.on('connect', syncConversations);
      load(getValues('items').length > 0);
      return () => {
        socket?.off(CHAT_EVENTS.newMessage, onMessage);
        socket?.off(CHAT_EVENTS.conversationCreated, syncConversations);
        socket?.off('connect', syncConversations);
        currentRequest.current?.abort();
        currentRequest.current = null;
      };
    }, [getValues, load, socket]),
  );

  const retry = useCallback(() => load(), [load]);
  const refresh = useCallback(() => load(true), [load]);
  const filtered = items.filter(item =>
    item.name
      .toLocaleLowerCase('vi')
      .includes(search.trim().toLocaleLowerCase('vi')),
  );
  return {
    control,
    items,
    filtered,
    status,
    error,
    refreshing,
    retry,
    refresh,
  };
}
