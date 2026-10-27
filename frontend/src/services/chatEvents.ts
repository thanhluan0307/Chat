import { parseMessage } from '../api/messages/api';
import type { ChatMessage } from '../api/messages';

export const CHAT_EVENTS = {
  newMessage: 'new-message',
  conversationCreated: 'conversation-created',
} as const;

/** Đọc tin từ socket bằng cùng bộ kiểm tra với HTTP; bỏ qua payload lỗi thay vì làm hỏng màn chat. */
export function readSocketMessage(payload: unknown): ChatMessage | null {
  if (!payload || typeof payload !== 'object' || !('message' in payload))
    return null;
  const message = payload.message;
  if (
    !message ||
    typeof message !== 'object' ||
    !('conversationId' in message) ||
    typeof message.conversationId !== 'string'
  )
    return null;
  try {
    return parseMessage(message, message.conversationId);
  } catch {
    return null;
  }
}
