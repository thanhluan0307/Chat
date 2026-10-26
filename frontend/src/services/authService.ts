import { signIn } from '../api/auth';
import type { AuthSession, SignInRequest } from '../api/auth';
import { getMe } from '../api/users';

/** Verify both credentials and identity before returning an authenticated session. */
export async function authenticate(
  values: SignInRequest,
): Promise<AuthSession> {
  const { accessToken, refreshToken } = await signIn(values);
  const user = await getMe(accessToken);
  return { accessToken, refreshToken, user };
}
