import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import App from '../App';
import { httpClient } from '../src/api/http';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
const user = {
  _id: 'user-1',
  username: 'luan',
  displayName: 'Thanh Luân',
  email: 'luan@example.com',
};
const summaries = [
  {
    _id: 'conversation-1',
    type: 'direct',
    participants: [
      { _id: user._id, displayName: user.displayName },
      { _id: 'friend-1', displayName: 'Linh Nguyễn' },
    ],
    lastMessage: {
      content: 'Hẹn gặp bạn nhé!',
      senderId: { _id: 'friend-1', displayName: 'Linh Nguyễn' },
      createdAt: '2026-01-15T08:30:00Z',
    },
    unreadCounts: { 'user-1': 2, 'friend-1': 99 },
  },
  {
    _id: 'group-1',
    type: 'group',
    participants: [],
    group: { name: 'Nhóm dự án' },
    lastMessage: null,
    unreadCounts: {},
  },
];

async function openChats() {
  await render(<App />);
  await fireEvent.changeText(screen.getByLabelText('Tên đăng nhập'), 'luan');
  await fireEvent.changeText(
    screen.getByLabelText('Mật khẩu'),
    'password-for-test',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByTestId('tab-chats');
}

beforeEach(() => {
  apiMock.reset();
  apiMock
    .onPost('/auth/signin')
    .replyOnce(200, { accessToken: 'test-access-token' });
  apiMock.onGet('/users/me').replyOnce(200, { user });
  apiMock.onGet('/users').reply(200, {
    users: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});
afterAll(() => apiMock.restore());

test('an empty API result shows the no-data view without mock conversations', async () => {
  apiMock.onGet('/conversations').reply(200, { conversations: [] });
  await openChats();
  expect(await screen.findByText('Chưa có cuộc trò chuyện')).toBeOnTheScreen();
  expect(screen.queryByText('Linh Nguyễn')).toBeNull();
  expect(screen.queryByText('Không tải được cuộc trò chuyện')).toBeNull();
  const request = apiMock.history.get.find(
    item => item.url === '/conversations',
  );
  expect(request?.headers?.Authorization).toBe('Bearer test-access-token');
});

test('loading is distinct from a successful empty result', async () => {
  let finish: (() => void) | undefined;
  apiMock.onGet('/conversations').replyOnce(
    () =>
      new Promise<[number, { conversations: unknown[] }]>(resolve => {
        finish = () => resolve([200, { conversations: [] }]);
      }),
  );
  await openChats();
  expect(
    await screen.findByLabelText('Đang tải cuộc trò chuyện'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có cuộc trò chuyện')).toBeNull();
  expect(finish).toBeDefined();
  await act(() => finish?.());
  expect(await screen.findByText('Chưa có cuộc trò chuyện')).toBeOnTheScreen();
});

test('real API summaries show partner names, group names, previews and the current user unread count', async () => {
  apiMock.onGet('/conversations').reply(200, { conversations: summaries });
  await openChats();
  expect(
    await screen.findByRole('button', {
      name: 'Mở trò chuyện với Linh Nguyễn',
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Mở trò chuyện với Nhóm dự án' }),
  ).toBeOnTheScreen();
  expect(screen.getByText('Hẹn gặp bạn nhé!')).toBeOnTheScreen();
  expect(screen.getByText('Chưa có tin nhắn')).toBeOnTheScreen();
  expect(screen.getByText('2')).toBeOnTheScreen();
  expect(screen.queryByText('99')).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText('Tìm cuộc trò chuyện'),
    'không tìm ra',
  );
  expect(
    await screen.findByText('Không tìm thấy cuộc trò chuyện.'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có cuộc trò chuyện')).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText('Tìm cuộc trò chuyện'),
    'Linh',
  );
  expect(
    await screen.findByRole('button', {
      name: 'Mở trò chuyện với Linh Nguyễn',
    }),
  ).toBeOnTheScreen();
});

test('a failed fetch shows a retry action instead of an empty state', async () => {
  apiMock.onGet('/conversations').replyOnce(503, { message: 'server error' });
  apiMock.onGet('/conversations').reply(200, { conversations: summaries });
  await openChats();
  expect(
    await screen.findByText('Không tải được cuộc trò chuyện'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có cuộc trò chuyện')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(
    await screen.findByRole('button', {
      name: 'Mở trò chuyện với Linh Nguyễn',
    }),
  ).toBeOnTheScreen();
  expect(
    apiMock.history.get.filter(item => item.url === '/conversations'),
  ).toHaveLength(2);
});

test('an invalid response is an error, not a successful empty list', async () => {
  apiMock.onGet('/conversations').reply(200, { conversations: 'invalid' });
  await openChats();
  expect(
    await screen.findByText(
      'Danh sách cuộc trò chuyện trả về không hợp lệ. Vui lòng thử lại.',
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có cuộc trò chuyện')).toBeNull();
});

test('a response from an old focus cannot overwrite the latest conversations', async () => {
  let finishOld: (() => void) | undefined;
  apiMock.onGet('/conversations').replyOnce(
    () =>
      new Promise<[number, { conversations: unknown[] }]>(resolve => {
        finishOld = () => resolve([200, { conversations: [] }]);
      }),
  );
  apiMock.onGet('/conversations').reply(200, { conversations: summaries });
  await openChats();
  await screen.findByLabelText('Đang tải cuộc trò chuyện');
  await fireEvent.press(screen.getByTestId('tab-friends'));
  await fireEvent.press(screen.getByTestId('tab-chats'));
  await screen.findByRole('button', { name: 'Mở trò chuyện với Nhóm dự án' });
  await act(() => finishOld?.());
  expect(
    screen.getByRole('button', { name: 'Mở trò chuyện với Nhóm dự án' }),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có cuộc trò chuyện')).toBeNull();
});
