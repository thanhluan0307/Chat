import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";

/** Gửi tin trực tiếp bằng tài khoản từ JWT, chỉ cho phép phòng chứa đúng người gửi và người nhận. */
export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, conversationId } = req.body;
    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";
    const senderId = req.user._id;

    let conversation;

    if (!content || content.length > 4000) {
      return res
        .status(400)
        .json({ message: "Nội dung phải có từ 1 đến 4000 ký tự" });
    }

    if (conversationId) {
      if (
        typeof conversationId !== "string" ||
        !/^[a-f\d]{24}$/i.test(conversationId)
      ) {
        return res
          .status(400)
          .json({ message: "ID cuộc trò chuyện không hợp lệ" });
      }
      conversation = await Conversation.findById(conversationId);
      if (!conversation)
        return res
          .status(404)
          .json({ message: "Cuộc trò chuyện không tồn tại" });
      const members = conversation.participants.map((member) =>
        member.userId.toString()
      );
      if (
        conversation.type !== "direct" ||
        members.length !== 2 ||
        !members.includes(senderId.toString()) ||
        !members.includes(recipientId)
      ) {
        return res
          .status(403)
          .json({ message: "Bạn không thể gửi tin vào cuộc trò chuyện này" });
      }
    }

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();

    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn trực tiếp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

/** Gửi tin nhóm sau khi middleware xác nhận người gửi là thành viên của phòng. */
export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";
    const senderId = req.user._id;
    const conversation = req.conversation;

    if (!content || content.length > 4000) {
      return res
        .status(400)
        .json({ message: "Nội dung phải có từ 1 đến 4000 ký tự" });
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
