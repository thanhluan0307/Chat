import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import type { PropsWithChildren } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { signOut as requestSignOut } from '../api/auth';
import type { AuthSession, SignInRequest } from '../api/auth';
import { registerAccessTokenProvider } from '../api/http';
import { authenticate } from '../services/authService';

interface SessionState {
  session: AuthSession | null;
  isSigningOut: boolean;
}
interface SessionContextValue {
  session: AuthSession | null;
  isSigningOut: boolean;
  signIn: (values: SignInRequest) => Promise<void>;
  signOut: () => Promise<void>;
}
const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

export function SessionProvider({ children }: PropsWithChildren) {
  const { control, setValue, getValues } = useForm<SessionState>({
    defaultValues: { session: null, isSigningOut: false },
  });
  const session = useWatch({ control, name: 'session' });
  const isSigningOut = useWatch({ control, name: 'isSigningOut' });
  useEffect(() => {
    // Read the current RHF session for every request and remove the reader on unmount.
    return registerAccessTokenProvider(() => getValues('session')?.accessToken);
  }, [getValues]);
  const signIn = useCallback(
    async (values: SignInRequest) => {
      const authenticated = await authenticate(values);
      setValue('session', authenticated);
    },
    [setValue],
  );
  const signOut = useCallback(async () => {
    setValue('isSigningOut', true);
    try {
      await requestSignOut();
    } catch {
      console.warn(
        'Server sign-out was unavailable; the local session was cleared.',
      );
    } finally {
      setValue('session', null);
      setValue('isSigningOut', false);
    }
  }, [setValue]);
  const value = useMemo(
    () => ({ session, isSigningOut, signIn, signOut }),
    [session, isSigningOut, signIn, signOut],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

/** Return the session and entry/exit actions inside SessionProvider. */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error('useSession must be used within SessionProvider');
  return context;
}
