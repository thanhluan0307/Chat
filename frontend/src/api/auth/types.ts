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
}
export interface AuthSession {
  accessToken: string;
  user: UserProfile;
}
