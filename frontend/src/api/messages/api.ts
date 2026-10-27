import { API_ENDPOINTS } from '../endpoints';
import { httpClient } from '../http';
import type { ChatMessage } from './types';

/** Kiểm tra tin nhắn trả về trước khi đưa vào giao diện của một phòng cụ thể. */
export function parseMessage(
  value: unknown,
  conversationId: string,
): ChatMessage {
  if (
    !value ||
    typeof value !== 'object' ||
    !('_id' in value) ||
    typeof value._id !== 'string' ||
    !value._id ||
    !('conversationId' in value) ||
    value.conversationId !== conversationId ||
    !('senderId' in value) ||
    typeof value.senderId !== 'string' ||
    !('createdAt' in value) ||
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    ('content' in value &&
      value.content != null &&
      typeof value.content !== 'string')
  )
    throw Error('Dữ liệu tin nhắn không hợp lệ. Vui lòng thử lại.');
  return {
    _id: value._id,
    conversationId,
    senderId: value.senderId,
    createdAt: value.createdAt,
    content:
      'content' in value && typeof value.content === 'string'
        ? value.content
        : '',
  };
}

/** Lấy 50 tin gần nhất từ API lịch sử hiện có, xác nhận tất cả tin thuộc đúng phòng. */
export async function getMessages(
  conversationId: string,
  signal?: AbortSignal,
): Promise<ChatMessage[]> {
  const { data } = await httpClient.get<unknown>(
    API_ENDPOINTS.conversations.messages(conversationId),
    { params: { limit: 50 }, signal },
  );
  if (
    !data ||
    typeof data !== 'object' ||
    !('messages' in data) ||
    !Array.isArray(data.messages)
  )
    throw Error('Không thể đọc lịch sử cuộc trò chuyện.');
  return data.messages.map(message => parseMessage(message, conversationId));
}

/** Gửi tin qua API HTTP direct/group có sẵn; senderId luôn do backend lấy từ JWT. */
export async function sendMessage(
  conversationId: string,
  type: 'direct' | 'group',
  content: string,
  recipientId?: string,
  signal?: AbortSignal,
): Promise<ChatMessage> {
  const { data } = await httpClient.post<unknown>(
    type === 'direct'
      ? API_ENDPOINTS.messages.direct
      : API_ENDPOINTS.messages.group,
    { conversationId, content, ...(type === 'direct' ? { recipientId } : {}) },
    { signal },
  );
  if (!data || typeof data !== 'object' || !('message' in data))
    throw Error('Không thể xác nhận tin nhắn đã gửi.');
  return parseMessage(data.message, conversationId);
}
