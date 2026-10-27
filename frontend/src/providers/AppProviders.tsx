import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from './SessionProvider';
import { SocketConnection } from './SocketConnection';

/** Ghép safe area, phiên đăng nhập và vòng đời socket cho toàn ứng dụng. */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <SocketConnection />
        {children}
      </SessionProvider>
    </SafeAreaProvider>
  );
}
