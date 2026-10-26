import { ApiError, httpClient } from '../http';
import { API_ENDPOINTS } from '../endpoints';
import type { SignInRequest, SignInResponse, SignUpRequest } from './types';

/** Exchange credentials for a token; callers verify identity before storing a session. */
export async function signIn({
  username,
  password,
}: SignInRequest): Promise<SignInResponse> {
  const { data } = await httpClient.post<unknown>(API_ENDPOINTS.auth.signIn, {
    username,
    password,
  });
  if (
    !data ||
    typeof data !== 'object' ||
    !('accessToken' in data) ||
    typeof data.accessToken !== 'string' ||
    !data.accessToken.trim()
  ) {
    throw new ApiError(
      'Không thể xác nhận phiên đăng nhập. Vui lòng thử lại.',
      0,
    );
  }
  return { accessToken: data.accessToken };
}

/** Create an account without forwarding confirmation fields or starting a session. */
export async function signUp({
  username,
  password,
  email,
  firstName,
  lastName,
}: SignUpRequest): Promise<void> {
  await httpClient.post<void>(API_ENDPOINTS.auth.signUp, {
    username,
    password,
    email,
    firstName,
    lastName,
  });
}

/** Request server sign-out using the refresh cookie issued by the backend. */
export async function signOut(): Promise<void> {
  await httpClient.post<void>(API_ENDPOINTS.auth.signOut);
}
