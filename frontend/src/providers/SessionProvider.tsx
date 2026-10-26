import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { PropsWithChildren } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { refreshSession, signOut as requestSignOut } from '../api/auth';
import type { AuthSession, SignInRequest } from '../api/auth';
import {
  ApiError,
  registerAccessTokenProvider,
  registerSessionRefresh,
} from '../api/http';
import { getMe } from '../api/users';
import { authenticate } from '../services/authService';
import {
  clearSession,
  readSession,
  saveSession,
} from '../storage/sessionStorage';

interface SessionState {
  session: AuthSession | null;
  isSigningOut: boolean;
  isRestoring: boolean;
  restoreError: string | null;
  signOutError: string | null;
}
interface SessionContextValue extends SessionState {
  signIn: (values: SignInRequest) => Promise<void>;
  signOut: () => Promise<void>;
  restore: () => void;
}
const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);
const isUnauthorized = (error: unknown) =>
  error instanceof ApiError && [401, 403, 404].includes(error.status);

export function SessionProvider({ children }: PropsWithChildren) {
  const { control, setValue, getValues } = useForm<SessionState>({
    defaultValues: {
      session: null,
      isSigningOut: false,
      isRestoring: true,
      restoreError: null,
      signOutError: null,
    },
  });
  const [session, isSigningOut, isRestoring, restoreError, signOutError] =
    useWatch({
      control,
      name: [
        'session',
        'isSigningOut',
        'isRestoring',
        'restoreError',
        'signOutError',
      ] as const,
    });
  const revision = useRef(0);
  const pendingRefresh = useRef<Promise<string> | null>(null);

  const refresh = useCallback((): Promise<string> => {
    if (pendingRefresh.current) return pendingRefresh.current;
    const current = getValues('session');
    const version = revision.current;
    if (!current)
      return Promise.reject(new ApiError('Vui lòng đăng nhập lại.', 401));
    const promise = (async () => {
      try {
        const accessToken = await refreshSession(current.refreshToken);
        if (revision.current !== version)
          throw new ApiError('Phiên đã kết thúc.', 401);
        const updated = { ...current, accessToken };
        await saveSession(updated);
        if (revision.current !== version)
          throw new ApiError('Phiên đã kết thúc.', 401);
        setValue('session', updated);
        return accessToken;
      } catch (error) {
        if (revision.current === version && isUnauthorized(error)) {
          await clearSession();
          if (revision.current === version) {
            setValue('session', null);
          }
        }
        throw error;
      }
    })();
    // Attach cleanup after assignment; the promise remains shared by concurrent 401s.
    promise.then(
      () => {
        if (pendingRefresh.current === promise) pendingRefresh.current = null;
      },
      () => {
        if (pendingRefresh.current === promise) pendingRefresh.current = null;
      },
    );
    pendingRefresh.current = promise;
    return promise;
  }, [getValues, setValue]);

  const restore = useCallback(() => {
    const version = ++revision.current;
    setValue('isRestoring', true);
    setValue('restoreError', null);
    (async () => {
      try {
        const saved = await readSession();
        if (revision.current !== version) return;
        setValue('session', saved);
        if (saved) {
          try {
            // Expired access tokens are refreshed by the shared Axios interceptor.
            const user = await getMe();
            const current = getValues('session');
            if (revision.current !== version || !current) return;
            const updated = { ...current, user };
            await saveSession(updated);
            if (revision.current === version) setValue('session', updated);
          } catch (error) {
            if (revision.current !== version) return;
            if (isUnauthorized(error) && getValues('session')) {
              await clearSession();
              if (revision.current === version) setValue('session', null);
            }
            // A network outage keeps the saved session; requests can be retried later.
          }
        }
      } catch {
        if (revision.current === version) {
          setValue(
            'restoreError',
            'Không thể đọc phiên đăng nhập trên thiết bị. Vui lòng thử lại.',
          );
        }
      } finally {
        if (revision.current === version) setValue('isRestoring', false);
      }
    })();
  }, [getValues, setValue]);

  useEffect(() => {
    const unregisterToken = registerAccessTokenProvider(
      () => getValues('session')?.accessToken,
    );
    const unregisterRefresh = registerSessionRefresh(
      refresh,
      () => revision.current,
    );
    restore();
    const lifecycle = revision;
    return () => {
      lifecycle.current++;
      unregisterToken();
      unregisterRefresh();
    };
  }, [getValues, refresh, restore]);

  const signIn = useCallback(
    async (values: SignInRequest) => {
      const version = ++revision.current;
      const authenticated = await authenticate(values);
      if (revision.current !== version) return;
      await saveSession(authenticated);
      if (revision.current === version) {
        setValue('signOutError', null);
        setValue('session', authenticated);
      }
    },
    [setValue],
  );

  const signOut = useCallback(async () => {
    if (getValues('isSigningOut')) return;
    const current = getValues('session');
    revision.current++;
    pendingRefresh.current = null;
    setValue('isSigningOut', true);
    setValue('signOutError', null);
    try {
      // Remove persistence before network I/O, including when the server is offline.
      await clearSession();
      setValue('session', null);
      setValue('isSigningOut', false);
    } catch {
      setValue(
        'signOutError',
        'Không thể xóa phiên trên thiết bị. Vui lòng thử lại.',
      );
      setValue('isSigningOut', false);
      return;
    }
    try {
      if (current) await requestSignOut(current.refreshToken);
    } catch {
      // Local sign-out is complete even when server revocation is unavailable.
    }
  }, [getValues, setValue]);

  const value = useMemo(
    () => ({
      session,
      isSigningOut,
      isRestoring,
      restoreError,
      signOutError,
      signIn,
      signOut,
      restore,
    }),
    [
      session,
      isSigningOut,
      isRestoring,
      restoreError,
      signOutError,
      signIn,
      signOut,
      restore,
    ],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error('useSession must be used within SessionProvider');
  return context;
}
