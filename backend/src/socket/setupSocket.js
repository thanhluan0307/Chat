import { createRequire } from "node:module";
import { userRoom } from "./rooms.js";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";

const require = createRequire(import.meta.url);
const createSocketIO = require("socket.io");

/**
 * Xác thực JWT, cho mỗi thiết bị vào phòng riêng của tài khoản để nhận tin realtime.
 * Dùng factory CommonJS của thư viện để khởi tạo bằng function.
 */
export function setupSocket(httpServer) {
  const io = createSocketIO(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });
  io.use(socketAuthMiddleware);
  io.on("connection", function onConnection(socket) {
    socket.join(userRoom(socket.user._id));
    console.info("[socket] BE nhận kết nối:", socket.id);
    socket.on("disconnect", function onDisconnect(reason) {
      console.info("[socket] BE nhận ngắt kết nối:", socket.id, reason);
    });
  });
  return io;
}
