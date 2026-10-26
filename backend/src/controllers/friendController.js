import Friend from "../models/Friend.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import mongoose from "mongoose";

export const sendFriendRequest = async (req, res) => {
  try {
    const { to: recipientId, message } = req.body ?? {};
    if (
      typeof recipientId !== "string" ||
      !/^[a-f\d]{24}$/i.test(recipientId)
    ) {
      return res
        .status(400)
        .json({ message: "to phải là ID người dùng hợp lệ." });
    }
    if (message !== undefined && typeof message !== "string") {
      return res.status(400).json({ message: "Lời nhắn phải là chuỗi." });
    }
    const normalizedMessage = message?.trim();
    if (normalizedMessage && normalizedMessage.length > 300) {
      return res
        .status(400)
        .json({ message: "Lời nhắn không được quá 300 ký tự." });
    }

    // Trust only the authenticated sender; canonicalize IDs before comparing them.
    const from = req.user._id.toString();
    const to = new mongoose.Types.ObjectId(recipientId).toString();

    if (from === to) {
      return res
        .status(400)
        .json({ message: "Không thể gửi lời mời kết bạn cho chính mình" });
    }

    const userExists = await User.exists({ _id: to });

    if (!userExists) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const [userA, userB] = [from, to].sort();

    const [alreadyFriends, existingRequest] = await Promise.all([
      Friend.findOne({ userA, userB }),
      FriendRequest.findOne({
        $or: [
          { from, to },
          { from: to, to: from },
        ],
      }),
    ]);

    if (alreadyFriends) {
      return res.status(409).json({ message: "Hai người đã là bạn bè" });
    }

    if (existingRequest) {
      return res
        .status(409)
        .json({ message: "Đã có lời mời kết bạn đang chờ" });
    }

    const request = await FriendRequest.create({
      from,
      to,
      pairKey: `${userA}:${userB}`,
      ...(normalizedMessage ? { message: normalizedMessage } : {}),
    });

    return res.status(201).json({
      message: "Gửi lời mời kết bạn thành công",
      request: {
        _id: request._id,
        from: request.from,
        to: request.to,
        ...(request.message ? { message: request.message } : {}),
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
    });
  } catch (error) {
    // The unique pair index also handles simultaneous and opposite-direction sends.
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Đã có lời mời kết bạn đang chờ" });
    }
    console.error("Lỗi khi gửi yêu cầu kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  const { requestId } = req.params;
  if (typeof requestId !== "string" || !/^[a-f\d]{24}$/i.test(requestId)) {
    return res.status(400).json({ message: "ID lời mời không hợp lệ." });
  }
  try {
    const userId = req.user._id;
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy lời mời kết bạn" });
    }
    if (request.to.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền chấp nhận lời mời này" });
    }
    if (request.from.toString() === userId.toString()) {
      return res
        .status(400)
        .json({ message: "Không thể kết bạn với chính mình" });
    }
    const from = await User.findById(request.from)
      .select("_id username displayName avatarUrl")
      .lean();
    if (!from) {
      return res
        .status(404)
        .json({ message: "Người gửi lời mời không còn tồn tại" });
    }
    const [userA, userB] = [
      request.from.toString(),
      request.to.toString(),
    ].sort();
    try {
      // A retry or simultaneous acceptance must not create a second friendship.
      await Friend.updateOne(
        { userA, userB },
        { $setOnInsert: { userA, userB } },
        { upsert: true }
      );
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    await FriendRequest.deleteOne({ _id: request._id, to: userId });
    return res.status(200).json({
      message: "Chấp nhận lời mời kết bạn thành công",
      newFriend: {
        _id: from._id,
        username: from.username,
        displayName: from.displayName,
        ...(from.avatarUrl ? { avatarUrl: from.avatarUrl } : {}),
      },
    });
  } catch (error) {
    console.error("Lỗi khi chấp nhận lời mời kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const declineFriendRequest = async (req, res) => {
  const { requestId } = req.params;
  if (typeof requestId !== "string" || !/^[a-f\d]{24}$/i.test(requestId)) {
    return res.status(400).json({ message: "ID lời mời không hợp lệ." });
  }
  try {
    const userId = req.user._id;
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy lời mời kết bạn" });
    }
    if (request.to.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền từ chối lời mời này" });
    }
    const deleted = await FriendRequest.deleteOne({
      _id: request._id,
      to: userId,
    });
    if (!deleted.deletedCount) {
      return res
        .status(404)
        .json({ message: "Lời mời đã được xử lý trước đó" });
    }
    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi từ chối lời mời kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getAllFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    const friendships = await Friend.find({
      $or: [
        {
          userA: userId,
        },
        {
          userB: userId,
        },
      ],
    })
      .populate("userA", "_id displayName avatarUrl username")
      .populate("userB", "_id displayName avatarUrl username")
      .lean();

    if (!friendships.length) {
      return res.status(200).json({ friends: [] });
    }

    const friends = friendships.map((f) =>
      f.userA._id.toString() === userId.toString() ? f.userB : f.userA
    );

    return res.status(200).json({ friends });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bạn bè", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const populateFields = "_id username displayName avatarUrl";

    const [sent, received] = await Promise.all([
      FriendRequest.find({ from: userId })
        .select("_id from to message createdAt updatedAt")
        .populate("to", populateFields)
        .sort({ createdAt: -1, _id: -1 })
        .lean(),
      FriendRequest.find({ to: userId })
        .select("_id from to message createdAt updatedAt")
        .populate("from", populateFields)
        .sort({ createdAt: -1, _id: -1 })
        .lean(),
    ]);

    res.status(200).json({ sent, received });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
