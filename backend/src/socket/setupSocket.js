import { createRequire } from "node:module";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";

const require = createRequire(import.meta.url);
const createSocketIO = require("socket.io");

/**
 * Gắn Socket.IO vào HTTP server, xác thực JWT và ghi log kết nối/ngắt kết nối.
 * Dùng factory CommonJS của thư viện để khởi tạo bằng function.
 */
export function setupSocket(httpServer) {
  const io = createSocketIO(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });
  io.use(socketAuthMiddleware);
  io.on("connection", function onConnection(socket) {
    console.info("[socket] BE nhận kết nối:", socket.id);
    socket.on("disconnect", function onDisconnect(reason) {
      console.info("[socket] BE nhận ngắt kết nối:", socket.id, reason);
    });
  });
  return io;
}
