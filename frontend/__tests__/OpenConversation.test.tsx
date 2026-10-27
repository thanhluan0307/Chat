import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import App from '../App';
import { httpClient } from '../src/api/http';
import { navigationRef } from '../src/navigation/navigationRef';
import { RouteName } from '../src/navigation/routes';
import { saveSession } from '../src/storage/sessionStorage';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
const user = {
  _id: '64b000000000000000000001',
  username: 'luan',
  displayName: 'Thanh Luân',
  email: 'luan@example.com',
};
const friend = {
  _id: '64b000000000000000000002',
  username: 'linh',
  displayName: 'Linh Nguyễn',
  friendshipStatus: 'friends',
};
const conversation = {
  _id: '64b000000000000000000010',
  type: 'direct',
  participants: [user, friend],
  lastMessage: null,
  unreadCounts: {},
};
const historyUrl = `/conversations/${conversation._id}/messages`;
const chatButton = 'Nhắn tin với Linh Nguyễn';
const date = '2026-10-27T10:00:00.000Z';
function creates() {
  return apiMock.history.post.filter(item => item.url === '/conversations');
}
function message(content: string, senderId = friend._id, id = 'message-1') {
  return {
    _id: id,
    conversationId: conversation._id,
    senderId,
    content,
    createdAt: date,
  };
}
async function openApp() {
  await saveSession({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user,
  });
  await render(<App />);
  await screen.findByTestId('tab-friends');
}
async function openFriends() {
  await openApp();
  await fireEvent.press(screen.getByTestId('tab-friends'));
  await screen.findByRole('button', { name: chatButton });
}

beforeEach(() => {
  apiMock.reset();
  apiMock.onGet('/users/me').reply(200, { user });
  apiMock.onGet('/conversations').reply(200, { conversations: [] });
  apiMock.onGet('/users').reply(200, {
    users: [
      friend,
      {
        _id: 'stranger',
        username: 'minh',
        displayName: 'Minh Anh',
        friendshipStatus: 'none',
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
  apiMock.onGet(historyUrl).reply(200, { messages: [], nextCursor: null });
});
afterAll(() => apiMock.restore());

test('a friend opens a real room with the authenticated create API and can reopen its existing ID', async () => {
  apiMock.onPost('/conversations').reply(201, { conversation });
  await openFriends();
  expect(
    screen.getByLabelText('Đã là bạn bè với Linh Nguyễn'),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Nhắn tin với Minh Anh' }),
  ).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: chatButton }));
  expect(await screen.findByText('Chưa có tin nhắn')).toBeOnTheScreen();
  expect(navigationRef.getCurrentRoute()).toMatchObject({
    name: RouteName.Conversation,
    params: {
      conversationId: conversation._id,
      title: friend.displayName,
      type: 'direct',
      recipientId: friend._id,
    },
  });
  expect(creates()[0]).toMatchObject({
    data: JSON.stringify({ type: 'direct', memberIds: [friend._id] }),
    headers: expect.objectContaining({
      Authorization: 'Bearer test-access-token',
    }),
  });
  expect(
    apiMock.history.get.find(item => item.url === historyUrl)?.params,
  ).toEqual({ limit: 50 });
  await act(() => navigationRef.goBack());
  await fireEvent.press(
    await screen.findByRole('button', { name: chatButton }),
  );
  await screen.findByText('Chưa có tin nhắn');
  expect(navigationRef.getCurrentRoute()?.params).toMatchObject({
    conversationId: conversation._id,
  });
  expect(creates()).toHaveLength(2);
});

test('the opening button blocks duplicate requests until the room is confirmed', async () => {
  let finish: (() => void) | undefined;
  apiMock.onPost('/conversations').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => resolve([201, { conversation }]);
      }),
  );
  await openFriends();
  await fireEvent.press(screen.getByRole('button', { name: chatButton }));
  const button = screen.getByRole('button', { name: chatButton });
  expect(button).toBeDisabled();
  expect(button).toHaveProp(
    'accessibilityState',
    expect.objectContaining({ busy: true }),
  );
  await fireEvent.press(button);
  expect(creates()).toHaveLength(1);
  expect(navigationRef.getCurrentRoute()?.name).toBe(RouteName.Friends);
  await act(() => finish?.());
  expect(await screen.findByText('Chưa có tin nhắn')).toBeOnTheScreen();
});

test.each([
  [
    503,
    { message: 'Không thể tạo phòng lúc này.' },
    'Máy chủ đang bận. Vui lòng thử lại sau.',
  ],
  [
    201,
    {
      conversation: {
        ...conversation,
        participants: [user, { ...friend, _id: 'someone-else' }],
      },
    },
    'Không thể xác nhận cuộc trò chuyện. Vui lòng thử lại.',
  ],
])(
  'a failed or invalid create response stays on friends and can be retried (%s)',
  async (code, body, error) => {
    apiMock.onPost('/conversations').replyOnce(code as number, body);
    apiMock.onPost('/conversations').reply(201, { conversation });
    await openFriends();
    await fireEvent.press(screen.getByRole('button', { name: chatButton }));
    expect(await screen.findByText(error as string)).toBeOnTheScreen();
    expect(navigationRef.getCurrentRoute()?.name).toBe(RouteName.Friends);
    expect(
      apiMock.history.get.filter(item => item.url === historyUrl),
    ).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Thử mở lại' }));
    expect(await screen.findByText('Chưa có tin nhắn')).toBeOnTheScreen();
  },
);

test('leaving friends cancels creation so a late response cannot navigate away from the selected tab', async () => {
  let finish: (() => void) | undefined;
  apiMock.onPost('/conversations').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => resolve([201, { conversation }]);
      }),
  );
  await openFriends();
  await fireEvent.press(screen.getByRole('button', { name: chatButton }));
  await fireEvent.press(screen.getByTestId('tab-profile'));
  expect(creates()[0].signal?.aborted).toBe(true);
  await act(() => finish?.());
  expect(await screen.findByText(user.email)).toBeOnTheScreen();
  expect(navigationRef.getCurrentRoute()?.name).toBe(RouteName.Profile);
});

test('accepting an invitation offers an explicit chat action for that friend', async () => {
  const request = {
    _id: 'request-1',
    from: friend,
    to: user._id,
    createdAt: date,
  };
  apiMock
    .onGet('/friends/requests')
    .replyOnce(200, { received: [request], sent: [] });
  apiMock.onGet('/friends/requests').reply(200, { received: [], sent: [] });
  apiMock
    .onPost('/friends/requests/request-1/accept')
    .reply(200, { newFriend: friend });
  apiMock.onPost('/conversations').reply(201, { conversation });
  await openApp();
  await fireEvent.press(screen.getByTestId('tab-notifications'));
  await fireEvent.press(
    await screen.findByRole('button', {
      name: 'Đồng ý kết bạn với Linh Nguyễn',
    }),
  );
  expect(
    await screen.findByText('Đã kết bạn với Linh Nguyễn.'),
  ).toBeOnTheScreen();
  expect(creates()).toHaveLength(0);
  await fireEvent.press(
    screen.getByRole('button', { name: 'Nhắn tin ngay với Linh Nguyễn' }),
  );
  expect(await screen.findByText('Chưa có tin nhắn')).toBeOnTheScreen();
  expect(JSON.parse(creates()[0].data).memberIds).toEqual([friend._id]);
});

test('history errors retry the real room; sending preserves a failed draft and renders only the server acknowledgement', async () => {
  apiMock.onGet('/conversations').reply(200, { conversations: [conversation] });
  let historyAttempts = 0;
  apiMock
    .onGet(historyUrl)
    .reply(() =>
      ++historyAttempts === 1
        ? [503, {}]
        : [200, { messages: [message('Chào Luân!')] }],
    );
  apiMock
    .onPost('/messages/direct')
    .replyOnce(500, { message: 'Gửi thất bại, thử lại nhé.' });
  let finish: (() => void) | undefined;
  apiMock.onPost('/messages/direct').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () =>
          resolve([
            201,
            { message: message('Chào Linh!', user._id, 'message-2') },
          ]);
      }),
  );
  await openApp();
  await fireEvent.press(await screen.findByText('Linh Nguyễn'));
  await screen.findByText('Máy chủ đang bận. Vui lòng thử lại sau.');
  await fireEvent.press(
    screen.getByRole('button', { name: 'Thử tải tin nhắn lại' }),
  );
  expect(await screen.findByText('Chào Luân!')).toBeOnTheScreen();
  await fireEvent.changeText(
    screen.getByLabelText('Nội dung tin nhắn'),
    '  Chào Linh!  ',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  await screen.findByText('Máy chủ đang bận. Vui lòng thử lại sau.');
  expect(screen.getByLabelText('Nội dung tin nhắn')).toHaveProp(
    'value',
    '  Chào Linh!  ',
  );
  expect(screen.queryByText('Chào Linh!')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  expect(screen.getByRole('button', { name: 'Gửi tin nhắn' })).toBeDisabled();
  expect(screen.queryByText('Chào Linh!')).toBeNull();
  await act(() => finish?.());
  expect(await screen.findByText('Chào Linh!')).toBeOnTheScreen();
  expect(screen.getByLabelText('Nội dung tin nhắn')).toHaveProp('value', '');
  expect(
    apiMock.history.post.filter(item => item.url === '/messages/direct'),
  ).toHaveLength(2);
});
