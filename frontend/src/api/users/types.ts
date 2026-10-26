export interface UserProfile {
  _id: string;
  username: string;
  displayName: string;
  email: string;
}

export interface UserSummary {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
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
  page?: number;
  limit?: number;
}
export interface UsersPage {
  users: UserSummary[];
  pagination: UsersPagination;
}
