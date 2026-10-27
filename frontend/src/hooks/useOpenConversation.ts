import { useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, useWatch } from 'react-hook-form';
import { createDirectConversation } from '../api/conversations';
import type { UserSummary } from '../api/users';
import { RouteName } from '../navigation/routes';
import type { RootStackParamList } from '../navigation/types';

interface OpenConversationState {
  openingId: string | null;
  error: string | null;
  failedUser: UserSummary | null;
}

/** Tạo/mở lại phòng direct bằng API rồi điều hướng; chặn bấm trùng và hủy khi rời màn. */
export function useOpenConversation() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { control, setValue, getValues } = useForm<OpenConversationState>({
    defaultValues: { openingId: null, error: null, failedUser: null },
  });
  const [openingId, error] = useWatch({
    control,
    name: ['openingId', 'error'] as const,
  });
  const currentRequest = useRef<AbortController | null>(null);

  useFocusEffect(
    useCallback(
      function manageRequest() {
        setValue('openingId', null);
        return function cleanup() {
          currentRequest.current?.abort();
          currentRequest.current = null;
        };
      },
      [setValue],
    ),
  );

  const openChat = useCallback(
    function openRoom(user: UserSummary) {
      if (currentRequest.current) return;
      const controller = new AbortController();
      currentRequest.current = controller;
      setValue('openingId', user._id);
      setValue('error', null);
      setValue('failedUser', null);
      (async function createRoom() {
        try {
          const conversation = await createDirectConversation(
            user._id,
            controller.signal,
          );
          if (controller.signal.aborted || !navigation.isFocused()) return;
          const partner = conversation.participants.find(
            person => person._id === user._id,
          );
          navigation.navigate(RouteName.Conversation, {
            conversationId: conversation._id,
            type: 'direct',
            recipientId: user._id,
            title:
              partner?.displayName?.trim() || user.displayName || user.username,
          });
        } catch (failure) {
          if (controller.signal.aborted) return;
          setValue(
            'error',
            failure instanceof Error
              ? failure.message
              : 'Không thể mở cuộc trò chuyện. Vui lòng thử lại.',
          );
          setValue('failedUser', user);
        } finally {
          if (currentRequest.current === controller) {
            currentRequest.current = null;
            if (!controller.signal.aborted) setValue('openingId', null);
          }
        }
      })();
    },
    [navigation, setValue],
  );
  const retry = useCallback(
    function retryOpening() {
      const user = getValues('failedUser');
      if (user) openChat(user);
    },
    [getValues, openChat],
  );
  return { openingId, error, openChat, retry };
}
