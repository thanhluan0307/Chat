export interface ConversationParticipant {
  _id?: string;
  displayName?: string;
}

export interface ConversationSummary {
  _id: string;
  type: 'direct' | 'group';
  participants: ConversationParticipant[];
  group?: { name?: string | null } | null;
  lastMessage?: {
    content?: string | null;
    createdAt?: string | null;
    senderId?: ConversationParticipant | null;
  } | null;
  lastMessageAt?: string | null;
  updatedAt?: string | null;
  unreadCounts?: Record<string, number>;
}
