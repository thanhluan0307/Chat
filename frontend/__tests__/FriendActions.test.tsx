import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import App from '../App';
import { httpClient } from '../src/api/http';
import type { UserSummary } from '../src/api/users';
import { saveSession } from '../src/storage/sessionStorage';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
const user = {
  _id: '64b000000000000000000001',
  username: 'luan',
  displayName: 'Thanh Luân',
  email: 'luan@example.com',
};
const linh: UserSummary = {
  _id: '64b000000000000000000002',
  username: 'linh',
  displayName: 'Linh Nguyễn',
  friendshipStatus: 'none',
};
const minh: UserSummary = {
  _id: '64b000000000000000000003',
  username: 'minh',
  displayName: 'Minh Anh',
  friendshipStatus: 'friends',
};
const date = '2026-10-26T10:00:00.000Z';
let users: UserSummary[];

function created(to = linh._id, message?: string) {
  return {
    request: {
      _id: '64b000000000000000000010',
      from: user._id,
      to,
      message,
      createdAt: date,
      updatedAt: date,
    },
  };
}
function allowSend() {
  apiMock.onPost('/friends/requests').reply(config => {
    const body = JSON.parse(config.data) as { to: string; message?: string };
    users = users.map(item =>
      item._id === body.to ? { ...item, friendshipStatus: 'sent' } : item,
    );
    return [201, created(body.to, body.message)];
  });
}
function sentRequests() {
  return apiMock.history.post.filter(item => item.url === '/friends/requests');
}
async function openFriends() {
  await saveSession({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user,
  });
  await render(<App />);
  await fireEvent.press(await screen.findByTestId('tab-friends'));
  await screen.findByText('Linh Nguyễn');
}
async function compose() {
  await fireEvent.press(
    screen.getByRole('button', { name: 'Kết bạn với Linh Nguyễn' }),
  );
  await screen.findByText('Gửi lời mời kết bạn');
}

beforeEach(() => {
  apiMock.reset();
  users = [{ ...linh }];
  apiMock.onGet('/users/me').reply(200, { user });
  apiMock.onGet('/conversations').reply(200, { conversations: [] });
  apiMock.onGet('/users').reply(() => [
    200,
    {
      users,
      pagination: {
        page: 1,
        limit: 20,
        total: users.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  ]);
});
afterAll(() => apiMock.restore());

test('the friends tab sends the chosen recipient and trimmed message, then keeps sent status after refocus', async () => {
  allowSend();
  apiMock.onGet('/friends/requests').reply(200, {
    received: [],
    sent: [
      {
        _id: 'request-sent',
        from: user._id,
        to: linh,
        message: 'Chào Linh!',
        createdAt: date,
      },
    ],
  });
  await openFriends();
  await compose();
  expect(sentRequests()).toHaveLength(0);
  await fireEvent.changeText(
    screen.getByLabelText('Lời nhắn'),
    '  Chào Linh!  ',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi lời mời' }));
  await screen.findByText('Đã gửi');
  expect(sentRequests()).toHaveLength(1);
  expect(sentRequests()[0]).toMatchObject({
    data: JSON.stringify({ to: linh._id, message: 'Chào Linh!' }),
    headers: expect.objectContaining({
      Authorization: 'Bearer test-access-token',
    }),
  });
  expect(screen.queryByText('Gửi lời mời kết bạn')).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Kết bạn với Linh Nguyễn' }),
  ).toBeNull();
  await fireEvent.press(screen.getByTestId('tab-profile'));
  await fireEvent.press(screen.getByTestId('tab-friends'));
  await screen.findByText('Đã gửi');
  await fireEvent.press(screen.getByTestId('tab-notifications'));
  await screen.findByText('Đã gửi (1)');
  await fireEvent.press(screen.getByRole('tab', { name: 'Lời mời đã gửi' }));
  expect(await screen.findByText('Chào Linh!')).toBeOnTheScreen();
});

test('cancel does not call the API and clears the message before reopening', async () => {
  await openFriends();
  await compose();
  await fireEvent.changeText(screen.getByLabelText('Lời nhắn'), 'draft');
  await fireEvent.press(screen.getByRole('button', { name: 'Hủy' }));
  expect(screen.queryByText('Gửi lời mời kết bạn')).toBeNull();
  expect(sentRequests()).toHaveLength(0);
  await compose();
  expect(screen.getByLabelText('Lời nhắn')).toHaveProp('value', '');
});

test('an optional empty message is omitted from the request', async () => {
  allowSend();
  await openFriends();
  await compose();
  await fireEvent.changeText(screen.getByLabelText('Lời nhắn'), '   ');
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi lời mời' }));
  await screen.findByText('Đã gửi');
  expect(JSON.parse(sentRequests()[0].data)).toEqual({ to: linh._id });
});

test('repeated taps during submission cannot send two requests', async () => {
  let finish: (() => void) | undefined;
  apiMock.onPost('/friends/requests').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => {
          users = users.map(item => ({ ...item, friendshipStatus: 'sent' }));
          resolve([201, created()]);
        };
      }),
  );
  await openFriends();
  await compose();
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi lời mời' }));
  const button = screen.getByRole('button', { name: 'Gửi lời mời' });
  expect(button).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
  await fireEvent.press(button);
  expect(sentRequests()).toHaveLength(1);
  await act(() => finish?.());
  expect(await screen.findByText('Đã gửi')).toBeOnTheScreen();
});

test('network failure retains the form and supports retry without marking a request as sent', async () => {
  apiMock.onPost('/friends/requests').networkErrorOnce();
  allowSend();
  await openFriends();
  await compose();
  await fireEvent.changeText(screen.getByLabelText('Lời nhắn'), 'Xin chào');
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi lời mời' }));
  await screen.findByText(
    'Không thể kết nối máy chủ. Kiểm tra kết nối mạng và thử lại.',
  );
  expect(screen.getByLabelText('Lời nhắn')).toHaveProp('value', 'Xin chào');
  expect(screen.getByRole('button', { name: 'Gửi lời mời' })).toBeEnabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi lời mời' }));
  await screen.findByText('Đã gửi');
  expect(sentRequests()).toHaveLength(2);
});

test('a conflict shows the server message, disables resend and refreshes the relationship', async () => {
  apiMock.onPost('/friends/requests').reply(() => {
    users = users.map(item => ({ ...item, friendshipStatus: 'received' }));
    return [409, { message: 'Đã có lời mời kết bạn đang chờ' }];
  });
  await openFriends();
  await compose();
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi lời mời' }));
  await screen.findByText('Đã có lời mời kết bạn đang chờ');
  expect(screen.getByRole('button', { name: 'Gửi lời mời' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Hủy' }));
  expect(
    await screen.findByRole('button', { name: 'Xem lời mời từ Linh Nguyễn' }),
  ).toBeOnTheScreen();
  expect(sentRequests()).toHaveLength(1);
});

test('friend and outgoing states cannot resend; an incoming request opens the received notifications even after viewing sent', async () => {
  const incoming: UserSummary = {
    ...linh,
    _id: '64b000000000000000000004',
    displayName: 'Quỳnh',
    username: 'quynh',
    friendshipStatus: 'received',
  };
  users = [{ ...linh, friendshipStatus: 'sent' }, minh, incoming];
  apiMock.onGet('/friends/requests').reply(200, {
    sent: [{ _id: 'request-out', from: user._id, to: linh, createdAt: date }],
    received: [
      {
        _id: 'request-in',
        from: incoming,
        to: user._id,
        message: 'Lời mời của Quỳnh',
        createdAt: date,
      },
    ],
  });
  await openFriends();
  expect(screen.getByText('Đã gửi')).toBeOnTheScreen();
  expect(screen.getByLabelText('Đã là bạn bè với Minh Anh')).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Kết bạn với Minh Anh' }),
  ).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Kết bạn với Linh Nguyễn' }),
  ).toBeNull();
  await fireEvent.press(screen.getByTestId('tab-notifications'));
  await screen.findByText('Lời mời của Quỳnh');
  await fireEvent.press(screen.getByRole('tab', { name: 'Lời mời đã gửi' }));
  await screen.findByText('@linh');
  await fireEvent.press(screen.getByTestId('tab-friends'));
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Xem lời mời từ Quỳnh' }),
  );
  expect(await screen.findByText('Lời mời của Quỳnh')).toBeOnTheScreen();
  expect(sentRequests()).toHaveLength(0);
});

test('an invalid success payload cannot falsely show a sent request', async () => {
  apiMock.onPost('/friends/requests').reply(201, { request: {} });
  await openFriends();
  await compose();
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi lời mời' }));
  await screen.findByText(
    'Không thể xác nhận lời mời đã gửi. Vui lòng làm mới danh sách.',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Hủy' }));
  expect(
    screen.getByRole('button', { name: 'Kết bạn với Linh Nguyễn' }),
  ).toBeOnTheScreen();
});
