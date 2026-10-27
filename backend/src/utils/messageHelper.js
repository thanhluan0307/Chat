import { CHAT_EVENTS } from "../socket/events.js";
import { userRoom } from "../socket/rooms.js";

/** Cập nhật tin cuối và số chưa đọc của từng thành viên trước khi lưu cuộc trò chuyện. */
export const updateConversationAfterCreateMessage = (
  conversation,
  message,
  senderId
) => {
  conversation.set({
    seenBy: [],
    lastMessageAt: message.createdAt,
    lastMessage: {
      _id: message._id,
      content: message.content,
      senderId,
      createdAt: message.createdAt,
    },
  });

  conversation.participants.forEach((p) => {
    const memberId = p.userId.toString();
    const isSender = memberId === senderId.toString();
    const prevCount = conversation.unreadCounts.get(memberId) || 0;
    conversation.unreadCounts.set(memberId, isSender ? 0 : prevCount + 1);
  });
};

/** Phát tin đã lưu tới mọi thiết bị của các thành viên; một thiết bị chỉ nhận một lần. */
export function emitNewMessage(io, conversation, message) {
  const rooms = conversation.participants.map((member) =>
    userRoom(member.userId)
  );
  io.to(rooms).emit(CHAT_EVENTS.newMessage, {
    message: {
      _id: message._id.toString(),
      conversationId: conversation._id.toString(),
      senderId: message.senderId.toString(),
      content: message.content ?? "",
      createdAt: message.createdAt.toISOString(),
    },
    conversation: {
      _id: conversation._id.toString(),
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
    },
    unreadCounts: Object.fromEntries(conversation.unreadCounts),
  });
}
