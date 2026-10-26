export interface UserProfile {
  _id: string;
  username: string;
  displayName: string;
  email: string;
}

export type FriendshipStatus = 'none' | 'friends' | 'sent' | 'received';

export interface UserSummary {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  friendshipStatus?: FriendshipStatus;
}
export interface UsersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
export interface GetUsersParams {
  search?: string;
  page?: number;
  limit?: number;
}
export interface UsersPage {
  users: UserSummary[];
  pagination: UsersPagination;
}
