import type { ConversationSummary } from '../../../api/conversations';

export interface ChatListItem {
  id: string;
  name: string;
  preview: string;
  avatarColor: string;
  time: string;
  unread: number;
}

function formatTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

/** Map backend summaries to rows using the current user's name and unread context. */
export function toChatListItem(
  conversation: ConversationSummary,
  userId: string,
): ChatListItem {
  const partner = conversation.participants.find(
    person => person._id && person._id !== userId,
  );
  const name =
    conversation.type === 'group'
      ? conversation.group?.name?.trim() || 'Nhóm trò chuyện'
      : partner?.displayName?.trim() || 'Người dùng ChatApp';
  const content = conversation.lastMessage?.content?.trim();
  const preview = content
    ? `${
        conversation.lastMessage?.senderId?._id === userId ? 'Bạn: ' : ''
      }${content}`
    : conversation.lastMessage
    ? 'Tin nhắn mới'
    : 'Chưa có tin nhắn';
  return {
    id: conversation._id,
    name,
    preview,
    avatarColor: conversation.type === 'group' ? '#258E8B' : '#5979E8',
    time: formatTime(
      conversation.lastMessage?.createdAt ??
        conversation.lastMessageAt ??
        conversation.updatedAt,
    ),
    unread: Math.max(0, Math.floor(conversation.unreadCounts?.[userId] ?? 0)),
  };
}
