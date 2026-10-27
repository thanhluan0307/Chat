export const API_ENDPOINTS = {
  auth: {
    signUp: '/auth/signup',
    signOut: '/auth/signout',
    signIn: '/auth/signin',
    refresh: '/auth/refresh',
  },
  users: {
    list: '/users',
    me: '/users/me',
  },
  conversations: {
    list: '/conversations',
    messages: (id: string) =>
      `/conversations/${encodeURIComponent(id)}/messages`,
  },
  messages: { direct: '/messages/direct', group: '/messages/group' },
  friends: {
    requests: '/friends/requests',
    acceptRequest: (id: string) =>
      `/friends/requests/${encodeURIComponent(id)}/accept`,
    declineRequest: (id: string) =>
      `/friends/requests/${encodeURIComponent(id)}/decline`,
  },
} as const;
