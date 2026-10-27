import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { useSession } from './SessionProvider';

/**
 * Quản lý socket theo phiên đăng nhập: chờ khôi phục phiên xong mới kết nối,
 * thay kết nối khi token đổi và dọn kết nối khi đăng xuất hoặc unmount.
 */
export function SocketConnection() {
  const { session, isRestoring } = useSession();
  const token = session?.accessToken;
  useEffect(
    function manageConnection() {
      if (!token || isRestoring) return;
      const socket = connectSocket(token);
      return function cleanupConnection() {
        disconnectSocket(socket);
      };
    },
    [token, isRestoring],
  );
  return null;
}
