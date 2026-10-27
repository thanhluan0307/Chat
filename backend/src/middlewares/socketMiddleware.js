import jwt from "jsonwebtoken";
import User from "../models/User.js";

/** Tạo lỗi xác thực thống nhất để từ chối handshake không hợp lệ. */
function connectionError() {
  const error = Error("Không thể xác thực kết nối socket");
  error.data = { code: "UNAUTHORIZED" };
  return error;
}

/**
 * Xác minh JWT và tài khoản trong handshake, gắn người dùng vào socket.
 * Gọi next() khi hợp lệ hoặc next(error) để từ chối kết nối.
 */
export async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token.trim())
      return next(connectionError());
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });
    if (
      typeof decoded !== "object" ||
      typeof decoded.userId !== "string" ||
      !/^[a-f\d]{24}$/i.test(decoded.userId)
    )
      return next(connectionError());
    const user = await User.findById(decoded.userId).select(
      "_id username displayName avatarUrl"
    );
    if (!user) return next(connectionError());
    socket.user = user;
    next();
  } catch {
    next(connectionError());
  }
}
