import { API_ENDPOINTS } from '../endpoints';
import { ApiError, httpClient } from '../http';
import type { ConversationParticipant, ConversationSummary } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isOptionalString(value: unknown): value is string | null | undefined {
  return value == null || typeof value === 'string';
}
function isParticipant(value: unknown): value is ConversationParticipant {
  return (
    isRecord(value) &&
    (value._id === undefined || typeof value._id === 'string') &&
    (value.displayName === undefined || typeof value.displayName === 'string')
  );
}
function isConversation(value: unknown): value is ConversationSummary {
  if (
    !isRecord(value) ||
    typeof value._id !== 'string' ||
    !value._id ||
    (value.type !== 'direct' && value.type !== 'group') ||
    !Array.isArray(value.participants) ||
    !value.participants.every(isParticipant)
  )
    return false;
  if (
    value.group != null &&
    (!isRecord(value.group) || !isOptionalString(value.group.name))
  )
    return false;
  if (value.lastMessage != null) {
    const message = value.lastMessage;
    if (
      !isRecord(message) ||
      !isOptionalString(message.content) ||
      !isOptionalString(message.createdAt) ||
      (message.senderId != null && !isParticipant(message.senderId))
    )
      return false;
  }
  return (
    isOptionalString(value.lastMessageAt) &&
    isOptionalString(value.updatedAt) &&
    (value.unreadCounts === undefined ||
      (isRecord(value.unreadCounts) &&
        Object.values(value.unreadCounts).every(
          count => typeof count === 'number' && Number.isFinite(count),
        )))
  );
}

/** Load the authenticated user's conversations; malformed responses are errors, not empty lists. */
export async function getConversations(
  signal?: AbortSignal,
): Promise<ConversationSummary[]> {
  const { data } = await httpClient.get<unknown>(
    API_ENDPOINTS.conversations.list,
    { signal },
  );
  if (!isRecord(data) || !Array.isArray(data.conversations)) {
    throw new ApiError(
      'Danh sách cuộc trò chuyện trả về không hợp lệ. Vui lòng thử lại.',
      0,
    );
  }
  const items: unknown[] = data.conversations;
  if (!items.every(isConversation)) {
    throw new ApiError(
      'Danh sách cuộc trò chuyện trả về không hợp lệ. Vui lòng thử lại.',
      0,
    );
  }
  return items;
}

/** Tạo hoặc mở lại direct với một người bạn, chỉ điều hướng khi nhận đúng phòng từ backend. */
export async function createDirectConversation(
  recipientId: string,
  signal?: AbortSignal,
): Promise<ConversationSummary> {
  const { data } = await httpClient.post<unknown>(
    API_ENDPOINTS.conversations.list,
    { type: 'direct', memberIds: [recipientId] },
    { signal },
  );
  if (
    !isRecord(data) ||
    !isConversation(data.conversation) ||
    data.conversation.type !== 'direct' ||
    data.conversation.participants.length !== 2 ||
    !data.conversation.participants.some(person => person._id === recipientId)
  ) {
    throw Error('Không thể xác nhận cuộc trò chuyện. Vui lòng thử lại.');
  }
  return data.conversation;
}
