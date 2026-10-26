import { ApiError, httpClient } from '../http';
import { API_ENDPOINTS } from '../endpoints';
import type { UserProfile } from './types';

function isUserProfile(value: unknown): value is UserProfile {
  return (
    value !== null &&
    typeof value === 'object' &&
    '_id' in value &&
    typeof value._id === 'string' &&
    'username' in value &&
    typeof value.username === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string' &&
    'email' in value &&
    typeof value.email === 'string'
  );
}

/** Fetch the current user with either the active session or an explicitly supplied token. */
export async function getMe(accessToken?: string): Promise<UserProfile> {
  const { data } = await httpClient.get<unknown>(
    API_ENDPOINTS.users.me,
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );
  if (
    !data ||
    typeof data !== 'object' ||
    !('user' in data) ||
    !isUserProfile(data.user)
  ) {
    throw new ApiError(
      'Không thể tải thông tin tài khoản. Vui lòng thử lại.',
      0,
    );
  }
  return data.user;
}
