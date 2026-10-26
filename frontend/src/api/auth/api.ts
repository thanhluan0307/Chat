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
    client: 'mobile',
  });
  if (
    !data ||
    typeof data !== 'object' ||
    !('accessToken' in data) ||
    typeof data.accessToken !== 'string' ||
    !data.accessToken.trim() ||
    !('refreshToken' in data) ||
    typeof data.refreshToken !== 'string' ||
    !data.refreshToken.trim()
  ) {
    throw new ApiError(
      'Không thể xác nhận phiên đăng nhập. Vui lòng thử lại.',
      0,
    );
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
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

/** Revoke the persisted native session on the server. */
export async function signOut(refreshToken: string): Promise<void> {
  await httpClient.post<void>(API_ENDPOINTS.auth.signOut, {
    client: 'mobile',
    refreshToken,
  });
}

export async function refreshSession(refreshToken: string): Promise<string> {
  const { data } = await httpClient.post<unknown>(API_ENDPOINTS.auth.refresh, {
    client: 'mobile',
    refreshToken,
  });
  if (
    !data ||
    typeof data !== 'object' ||
    !('accessToken' in data) ||
    typeof data.accessToken !== 'string' ||
    !data.accessToken.trim()
  )
    throw new ApiError('Không thể làm mới phiên đăng nhập.', 0);
  return data.accessToken;
}
