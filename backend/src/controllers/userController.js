import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";
import Friend from "../models/Friend.js";
import FriendRequest from "../models/FriendRequest.js";

async function getFriendshipStatuses(userId, users) {
  const statuses = new Map();
  if (!users.length) return statuses;
  const ids = users.map((user) => user._id);
  const [friendships, requests] = await Promise.all([
    Friend.find({
      $or: [
        { userA: userId, userB: { $in: ids } },
        { userB: userId, userA: { $in: ids } },
      ],
    })
      .select("userA userB")
      .lean(),
    FriendRequest.find({
      $or: [
        { from: userId, to: { $in: ids } },
        { to: userId, from: { $in: ids } },
      ],
    })
      .select("from to")
      .lean(),
  ]);
  const currentId = userId.toString();
  for (const request of requests) {
    const incoming = request.to.toString() === currentId;
    const otherId = (incoming ? request.from : request.to).toString();
    if (incoming || !statuses.has(otherId))
      statuses.set(otherId, incoming ? "received" : "sent");
  }
  for (const friendship of friendships) {
    const otherId = (
      friendship.userA.toString() === currentId
        ? friendship.userB
        : friendship.userA
    ).toString();
    statuses.set(otherId, "friends");
  }
  return statuses;
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Return a paginated public directory of other users for the authenticated client. */
export const getUsers = async (req, res) => {
  const search = req.query.search;
  if (
    search !== undefined &&
    (typeof search !== "string" || search.length > 100)
  ) {
    return res
      .status(400)
      .json({ message: "search phải là chuỗi tối đa 100 ký tự." });
  }
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 20);
  if (
    page === null ||
    limit === null ||
    limit > 100 ||
    !Number.isSafeInteger((page - 1) * limit)
  ) {
    return res.status(400).json({
      message:
        "page phải là số nguyên dương; limit phải là số nguyên từ 1 đến 100.",
    });
  }
  try {
    const filter = { _id: { $ne: req.user._id } };
    if (search?.trim()) {
      const pattern = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { displayName: { $regex: pattern, $options: "i" } },
        { username: { $regex: pattern, $options: "i" } },
      ];
    }
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("_id displayName username avatarUrl")
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    const statuses = await getFriendshipStatuses(req.user._id, users);
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      users: users.map((user) => ({
        ...user,
        friendshipStatus: statuses.get(user._id.toString()) ?? "none",
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && total > 0,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const authMe = async (req, res) => {
  try {
    const user = req.user; // lấy từ authMiddleware

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Lỗi khi gọi authMe", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const searchUserByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim() === "") {
      return res
        .status(400)
        .json({ message: "Cần cung cấp username trong query." });
    }

    const user = await User.findOne({ username }).select(
      "_id displayName username avatarUrl"
    );

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi xảy ra khi searchUserByUsername", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadImageFromBuffer(file.buffer);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        avatarUrl: result.secure_url,
        avatarId: result.public_id,
      },
      {
        new: true,
      }
    ).select("avatarUrl");

    if (!updatedUser.avatarUrl) {
      return res.status(400).json({ message: "Avatar trả về null" });
    }

    return res.status(200).json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error("Lỗi xảy ra khi upload avatar", error);
    return res.status(500).json({ message: "Upload failed" });
  }
};
