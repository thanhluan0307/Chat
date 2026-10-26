import { ApiError, httpClient } from '../http';
import { API_ENDPOINTS } from '../endpoints';
import type {
  GetUsersParams,
  UserProfile,
  UsersPage,
  UsersPagination,
  UserSummary,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isUserSummary(value: unknown): value is UserSummary {
  return (
    isRecord(value) &&
    typeof value._id === 'string' &&
    Boolean(value._id) &&
    typeof value.username === 'string' &&
    typeof value.displayName === 'string' &&
    (value.avatarUrl == null || typeof value.avatarUrl === 'string')
  );
}
function isPagination(value: unknown): value is UsersPagination {
  if (!isRecord(value)) return false;
  const { page, limit, total, totalPages, hasNextPage, hasPreviousPage } =
    value;
  return (
    typeof page === 'number' &&
    Number.isSafeInteger(page) &&
    page >= 1 &&
    typeof limit === 'number' &&
    Number.isSafeInteger(limit) &&
    limit >= 1 &&
    limit <= 100 &&
    typeof total === 'number' &&
    Number.isSafeInteger(total) &&
    total >= 0 &&
    typeof totalPages === 'number' &&
    Number.isSafeInteger(totalPages) &&
    totalPages >= 0 &&
    totalPages === Math.ceil(total / limit) &&
    hasNextPage === page < totalPages &&
    hasPreviousPage === (page > 1 && total > 0)
  );
}

/** Fetch one validated page of the public user directory with the active session token. */
export async function getUsers(
  { page = 1, limit = 20, search }: GetUsersParams = {},
  signal?: AbortSignal,
): Promise<UsersPage> {
  const { data } = await httpClient.get<unknown>(API_ENDPOINTS.users.list, {
    params: {
      page,
      limit,
      ...(search?.trim() ? { search: search.trim() } : {}),
    },
    signal,
  });
  if (
    !isRecord(data) ||
    !Array.isArray(data.users) ||
    !data.users.every(isUserSummary) ||
    !isPagination(data.pagination) ||
    data.pagination.page !== page ||
    data.pagination.limit !== limit ||
    data.users.length > limit
  ) {
    throw new ApiError(
      'Danh sách người dùng trả về không hợp lệ. Vui lòng thử lại.',
      0,
    );
  }
  return { users: data.users, pagination: data.pagination };
}

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
