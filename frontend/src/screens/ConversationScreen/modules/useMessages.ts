import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useForm, useWatch } from 'react-hook-form';
import { getMessages, sendMessage } from '../../../api/messages';
import type { ChatMessage } from '../../../api/messages';
import type { RootStackParamList } from '../../../navigation/types';

interface MessagesState {
  messages: ChatMessage[];
  draft: string;
  status: 'loading' | 'success' | 'error';
  error: string | null;
  sending: boolean;
  sendError: string | null;
  refreshing: boolean;
}

/** Gộp tin theo ID và xếp mới nhất trước cho FlatList inverted. */
function mergeMessages(...pages: ChatMessage[][]): ChatMessage[] {
  const messages = new Map(pages.flat().map(message => [message._id, message]));
  return [...messages.values()].sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      b._id.localeCompare(a._id),
  );
}

/** Đọc lịch sử và gửi tin bằng HTTP, dùng RHF giữ draft/trạng thái; chưa xử lý sự kiện socket. */
export function useMessages({
  conversationId,
  type,
  recipientId,
}: RootStackParamList['Conversation']) {
  const { control, getValues, setValue } = useForm<MessagesState>({
    defaultValues: {
      messages: [],
      draft: '',
      status: 'loading',
      error: null,
      sending: false,
      sendError: null,
      refreshing: false,
    },
  });
  const [messages, draft, status, error, sending, sendError, refreshing] =
    useWatch({
      control,
      name: [
        'messages',
        'draft',
        'status',
        'error',
        'sending',
        'sendError',
        'refreshing',
      ] as const,
    });
  const readRequest = useRef<AbortController | null>(null);
  const writeRequest = useRef<AbortController | null>(null);
  const load = useCallback(
    async function loadHistory() {
      readRequest.current?.abort();
      const controller = new AbortController();
      readRequest.current = controller;
      const keepRows = getValues('status') === 'success';
      setValue('error', null);
      setValue('refreshing', keepRows);
      if (!keepRows) setValue('status', 'loading');
      try {
        const result = await getMessages(conversationId, controller.signal);
        if (controller.signal.aborted || readRequest.current !== controller)
          return;
        setValue('messages', mergeMessages(getValues('messages'), result));
        setValue('status', 'success');
      } catch (failure) {
        if (controller.signal.aborted) return;
        setValue(
          'error',
          failure instanceof Error
            ? failure.message
            : 'Không thể tải tin nhắn.',
        );
        if (!keepRows) setValue('status', 'error');
      } finally {
        if (readRequest.current === controller) {
          readRequest.current = null;
          setValue('refreshing', false);
        }
      }
    },
    [conversationId, getValues, setValue],
  );
  useFocusEffect(
    useCallback(
      function loadOnFocus() {
        load();
        return function cleanup() {
          readRequest.current?.abort();
          readRequest.current = null;
        };
      },
      [load],
    ),
  );
  useEffect(function manageWrite() {
    return function cleanup() {
      writeRequest.current?.abort();
    };
  }, []);
  const send = useCallback(
    function sendDraft() {
      const content = getValues('draft').trim();
      if (
        !content ||
        writeRequest.current ||
        getValues('status') !== 'success' ||
        (type === 'direct' && !recipientId)
      )
        return;
      const controller = new AbortController();
      writeRequest.current = controller;
      setValue('sending', true);
      setValue('sendError', null);
      (async function save() {
        try {
          const message = await sendMessage(
            conversationId,
            type,
            content,
            recipientId,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setValue('messages', mergeMessages(getValues('messages'), [message]));
          setValue('draft', '');
        } catch (failure) {
          if (!controller.signal.aborted)
            setValue(
              'sendError',
              failure instanceof Error
                ? failure.message
                : 'Không thể gửi tin nhắn. Vui lòng thử lại.',
            );
        } finally {
          if (writeRequest.current === controller) {
            writeRequest.current = null;
            if (!controller.signal.aborted) setValue('sending', false);
          }
        }
      })();
    },
    [conversationId, type, recipientId, getValues, setValue],
  );
  const refresh = useCallback(
    function refreshHistory() {
      load();
    },
    [load],
  );
  return {
    control,
    messages,
    draft,
    status,
    error,
    sending,
    sendError,
    refreshing,
    refresh,
    send,
  };
}
