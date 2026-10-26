export const API_ENDPOINTS = {
  auth: {
    signUp: '/auth/signup',
    signOut: '/auth/signout',
    signIn: '/auth/signin',
  },
  users: {
    list: '/users',
    me: '/users/me',
  },
  conversations: {
    list: '/conversations',
  },
} as const;
