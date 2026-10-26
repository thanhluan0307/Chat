import type { UserSummary } from '../users';

/** A pending request with the other person normalized from the populated API response. */
export interface FriendRequestItem {
  _id: string;
  user: UserSummary | null;
  message?: string;
  createdAt: string;
}

export interface FriendRequests {
  sent: FriendRequestItem[];
  received: FriendRequestItem[];
}

export type FriendRequestFilter = keyof FriendRequests;
export type FriendRequestAction = 'accept' | 'decline';

export interface SendFriendRequest {
  to: string;
  message?: string;
}
