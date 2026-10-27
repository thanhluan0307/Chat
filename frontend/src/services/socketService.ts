import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

/**
 * Tạo socket có JWT nhưng chưa kết nối; provider sẽ gọi connect sau khi mount.
 * Socket.IO tự reconnect khi mất mạng, dùng cùng URL của backend.
 */
export function createSocket(accessToken: string): Socket | null {
  if (!SOCKET_URL) return null;
  return io(SOCKET_URL, {
    forceNew: true,
    autoConnect: false,
    auth: { token: accessToken },
    reconnection: true,
  });
}

/** Gắn log vòng đời và bắt đầu kết nối; được gọi lại cùng listener mới khi effect chạy lại. */
export function connectSocket(socket: Socket): void {
  socket.on('connect', function onConnect() {
    console.info('[socket] FE đã kết nối BE:', socket.id);
  });
  socket.on('disconnect', function onDisconnect(reason) {
    console.info('[socket] FE đã ngắt kết nối:', reason);
  });
  socket.on('connect_error', function onConnectError(error) {
    console.info('[socket] FE chưa kết nối được BE:', error.message);
  });
  socket.connect();
}

/** Ngắt kết nối và xóa listener khi đăng xuất, đổi token hoặc unmount. */
export function disconnectSocket(socket: Socket | null): void {
  if (!socket) return;
  socket.disconnect();
  socket.removeAllListeners();
}
