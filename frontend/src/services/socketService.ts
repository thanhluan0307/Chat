import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

/**
 * Kết nối frontend với backend bằng JWT, tự reconnect khi mất mạng
 * và ghi log vòng đời kết nối; trả instance để dọn khi kết thúc phiên.
 */
export function connectSocket(accessToken: string): Socket | null {
  if (!SOCKET_URL) return null;
  const socket = io(SOCKET_URL, {
    forceNew: true,
    autoConnect: false,
    auth: { token: accessToken },
    reconnection: true,
  });
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
  return socket;
}

/** Ngắt kết nối và xóa listener khi đăng xuất, đổi token hoặc unmount. */
export function disconnectSocket(socket: Socket | null): void {
  if (!socket) return;
  socket.disconnect();
  socket.removeAllListeners();
}
