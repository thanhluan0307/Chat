import type { UserProfile } from '../users/types';

export interface SignInRequest {
  username: string;
  password: string;
}
export interface SignUpRequest extends SignInRequest {
  email: string;
  firstName: string;
  lastName: string;
}
export interface SignInResponse {
  accessToken: string;
  refreshToken: string;
}
export interface AuthSession extends SignInResponse {
  user: UserProfile;
}
