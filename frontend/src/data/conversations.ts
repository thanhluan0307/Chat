export interface Message {
  id: string;
  text: string;
  outgoing: boolean;
  time: string;
}
export interface Conversation {
  id: string;
  name: string;
  avatarColor: string;
  preview: string;
  time: string;
  unread: number;
  messages: Message[];
}

// Local fixtures keep the starter usable without a running API.
export const conversations: Conversation[] = [
  {
    id: 'linh',
    name: 'Linh Nguyễn',
    avatarColor: '#5979E8',
    preview: 'Chiều nay mình gặp nhau nhé!',
    time: '09:41',
    unread: 2,
    messages: [
      {
        id: 'linh-2',
        text: 'Chiều nay mình gặp nhau nhé!',
        outgoing: false,
        time: '09:41',
      },
      {
        id: 'linh-1',
        text: 'Chào Linh, hôm nay bạn thế nào?',
        outgoing: true,
        time: '09:40',
      },
    ],
  },
  {
    id: 'minh',
    name: 'Minh Anh',
    avatarColor: '#258E8B',
    preview: 'Cảm ơn bạn nhiều nha 🙌',
    time: '08:30',
    unread: 0,
    messages: [
      {
        id: 'minh-2',
        text: 'Cảm ơn bạn nhiều nha 🙌',
        outgoing: false,
        time: '08:30',
      },
      {
        id: 'minh-1',
        text: 'Mình gửi bạn tài liệu rồi nhé.',
        outgoing: true,
        time: '08:28',
      },
    ],
  },
  {
    id: 'bao',
    name: 'Bảo Trần',
    avatarColor: '#C47E45',
    preview: 'Chúc bạn một ngày thật vui!',
    time: 'Hôm qua',
    unread: 0,
    messages: [
      {
        id: 'bao-1',
        text: 'Chúc bạn một ngày thật vui!',
        outgoing: false,
        time: '17:20',
      },
    ],
  },
];
