import { API_ENDPOINTS } from '../endpoints';
import { ApiError, httpClient } from '../http';
import type { UserSummary } from '../users';
import type {
  FriendRequestFilter,
  FriendRequestItem,
  FriendRequests,
  SendFriendRequest,
} from './types';

const invalidResponse = () =>
  new ApiError(
    'Danh sách lời mời kết bạn trả về không hợp lệ. Vui lòng thử lại.',
    0,
  );

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Send only the recipient and optional message; identity comes from Authorization. */
export async function sendFriendRequest(
  { to, message }: SendFriendRequest,
  signal?: AbortSignal,
): Promise<void> {
  const { data } = await httpClient.post<unknown>(
    API_ENDPOINTS.friends.requests,
    {
      to,
      ...(message?.trim() ? { message: message.trim() } : {}),
    },
    { signal },
  );
  if (
    !isRecord(data) ||
    !isRecord(data.request) ||
    typeof data.request._id !== 'string' ||
    !data.request._id ||
    typeof data.request.from !== 'string' ||
    !data.request.from ||
    data.request.to !== to ||
    typeof data.request.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(data.request.createdAt))
  ) {
    throw new ApiError(
      'Không thể xác nhận lời mời đã gửi. Vui lòng làm mới danh sách.',
      0,
    );
  }
}

function isUser(value: unknown): value is UserSummary {
  return (
    isRecord(value) &&
    typeof value._id === 'string' &&
    !!value._id &&
    typeof value.username === 'string' &&
    typeof value.displayName === 'string' &&
    (value.avatarUrl == null || typeof value.avatarUrl === 'string')
  );
}

export async function acceptFriendRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<void> {
  const { data } = await httpClient.post<unknown>(
    API_ENDPOINTS.friends.acceptRequest(requestId),
    undefined,
    { signal },
  );
  if (!isRecord(data) || !isUser(data.newFriend)) {
    throw new ApiError(
      'Không thể xác nhận kết bạn thành công. Vui lòng làm mới danh sách.',
      0,
    );
  }
}

export async function declineFriendRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<void> {
  const { status } = await httpClient.post<void>(
    API_ENDPOINTS.friends.declineRequest(requestId),
    undefined,
    { signal },
  );
  if (status !== 204) {
    throw new ApiError(
      'Không thể xác nhận đã từ chối lời mời. Vui lòng làm mới danh sách.',
      0,
    );
  }
}

function parseRequests(
  value: unknown,
  direction: FriendRequestFilter,
): FriendRequestItem[] {
  if (!Array.isArray(value)) throw invalidResponse();
  return value.map(item => {
    if (!isRecord(item)) throw invalidResponse();
    const other = direction === 'sent' ? item.to : item.from;
    const ownId = direction === 'sent' ? item.from : item.to;
    if (
      typeof item._id !== 'string' ||
      !item._id ||
      typeof ownId !== 'string' ||
      !ownId ||
      (other !== null && !isUser(other)) ||
      (item.message != null && typeof item.message !== 'string') ||
      typeof item.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(item.createdAt))
    )
      throw invalidResponse();
    return {
      _id: item._id,
      user:
        other === null
          ? null
          : {
              _id: other._id,
              username: other.username,
              displayName: other.displayName,
              avatarUrl: other.avatarUrl,
            },
      ...(typeof item.message === 'string' && item.message.trim()
        ? { message: item.message.trim() }
        : {}),
      createdAt: item.createdAt,
    };
  });
}

export async function getFriendRequests(
  signal?: AbortSignal,
): Promise<FriendRequests> {
  const { data } = await httpClient.get<unknown>(
    API_ENDPOINTS.friends.requests,
    { signal },
  );
  if (!isRecord(data)) throw invalidResponse();
  return {
    sent: parseRequests(data.sent, 'sent'),
    received: parseRequests(data.received, 'received'),
  };
}
