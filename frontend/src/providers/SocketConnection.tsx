import { createContext, useContext, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import type { Socket } from 'socket.io-client';
import {
  createSocket,
  connectSocket,
  disconnectSocket,
} from '../services/socketService';
import { useSession } from './SessionProvider';

const SocketContext = createContext<Socket | null>(null);

/**
 * Quản lý socket theo phiên đăng nhập: chờ khôi phục phiên xong mới kết nối,
 * thay kết nối khi token đổi và dọn kết nối khi đăng xuất hoặc unmount.
 */
export function SocketConnection({ children }: PropsWithChildren) {
  const { session, isRestoring } = useSession();
  const token = session?.accessToken;
  const socket = useMemo(
    () => (token && !isRestoring ? createSocket(token) : null),
    [token, isRestoring],
  );
  useEffect(
    function manageConnection() {
      if (!socket) return;
      connectSocket(socket);
      return function cleanupConnection() {
        disconnectSocket(socket);
      };
    },
    [socket],
  );
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

/** Cấp cùng một socket theo phiên cho các màn đăng ký và dọn listener của riêng mình. */
export function useSocket(): Socket | null {
  return useContext(SocketContext);
}
