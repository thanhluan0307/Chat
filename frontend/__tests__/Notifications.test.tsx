import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import App from '../App';
import { getFriendRequests } from '../src/api/friends';
import { httpClient } from '../src/api/http';
import { saveSession } from '../src/storage/sessionStorage';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
const user = {
  _id: 'user-1',
  username: 'luan',
  displayName: 'Thanh Luân',
  email: 'luan@example.com',
};
const linh = { _id: 'user-2', username: 'linh', displayName: 'Linh Nguyễn' };
const minh = { _id: 'user-3', username: 'minh', displayName: 'Minh Anh' };
const received = {
  _id: 'request-in',
  from: linh,
  to: user._id,
  message: 'Chào Luân, kết bạn nhé!',
  createdAt: '2026-10-26T10:00:00.000Z',
  updatedAt: '2026-10-26T10:00:00.000Z',
};
const sent = {
  _id: 'request-out',
  from: user._id,
  to: minh,
  message: 'Chào Minh!',
  createdAt: '2026-10-26T09:00:00.000Z',
  updatedAt: '2026-10-26T09:00:00.000Z',
};
const payload = { received: [received], sent: [sent] };

beforeEach(() => {
  apiMock.reset();
  apiMock.onGet('/users/me').reply(200, { user });
  apiMock.onGet('/conversations').reply(200, { conversations: [] });
});
afterAll(() => apiMock.restore());

async function openNotifications() {
  await saveSession({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user,
  });
  await render(<App />);
  await fireEvent.press(await screen.findByTestId('tab-notifications'));
}
function listRequests() {
  return apiMock.history.get.filter(item => item.url === '/friends/requests');
}

test('notification tab loads authenticated requests and switches between received and sent without fetching again', async () => {
  apiMock.onGet('/friends/requests').reply(200, payload);
  await openNotifications();
  expect(await screen.findByText('Linh Nguyễn')).toBeOnTheScreen();
  expect(screen.getByText('@linh')).toBeOnTheScreen();
  expect(screen.getByText('Chào Luân, kết bạn nhé!')).toBeOnTheScreen();
  expect(screen.getByText('Đang chờ phản hồi')).toBeOnTheScreen();
  expect(screen.getByText('Đã nhận (1)')).toBeOnTheScreen();
  expect(screen.getByText('Đã gửi (1)')).toBeOnTheScreen();
  expect(screen.queryByText('Minh Anh')).toBeNull();
  expect(listRequests()[0].headers?.Authorization).toBe(
    'Bearer test-access-token',
  );
  await fireEvent.press(screen.getByRole('tab', { name: 'Lời mời đã gửi' }));
  expect(await screen.findByText('Minh Anh')).toBeOnTheScreen();
  expect(screen.getByText('Chào Minh!')).toBeOnTheScreen();
  expect(screen.queryByText('Linh Nguyễn')).toBeNull();
  expect(listRequests()).toHaveLength(1);
});

test('each empty category has its own no-data view', async () => {
  apiMock.onGet('/friends/requests').reply(200, { received: [], sent: [] });
  await openNotifications();
  expect(await screen.findByText('Chưa có lời mời đã nhận')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('tab', { name: 'Lời mời đã gửi' }));
  expect(await screen.findByText('Chưa có lời mời đã gửi')).toBeOnTheScreen();
});

test('loading is shown until the response arrives, including when the selected category changes', async () => {
  let finish: (() => void) | undefined;
  apiMock.onGet('/friends/requests').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => resolve([200, payload]);
      }),
  );
  await openNotifications();
  expect(
    await screen.findByLabelText('Đang tải lời mời kết bạn'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có lời mời đã nhận')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: 'Lời mời đã gửi' }));
  await act(() => finish?.());
  expect(await screen.findByText('Minh Anh')).toBeOnTheScreen();
  expect(screen.queryByText('Linh Nguyễn')).toBeNull();
});

test('failed initial requests can be retried', async () => {
  apiMock.onGet('/friends/requests').replyOnce(503, {});
  apiMock.onGet('/friends/requests').reply(200, payload);
  await openNotifications();
  await screen.findByText('Không tải được lời mời kết bạn');
  expect(screen.queryByText('Chưa có lời mời đã nhận')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Linh Nguyễn')).toBeOnTheScreen();
  expect(listRequests()).toHaveLength(2);
});

test('pull to refresh replaces the data and retains the selected category', async () => {
  apiMock.onGet('/friends/requests').reply(200, payload);
  await openNotifications();
  await screen.findByText('Linh Nguyễn');
  await fireEvent.press(screen.getByRole('tab', { name: 'Lời mời đã gửi' }));
  apiMock.onGet('/friends/requests').reply(200, { received: [], sent: [] });
  await fireEvent(screen.getByTestId('friend-requests-list'), 'refresh');
  expect(await screen.findByText('Chưa có lời mời đã gửi')).toBeOnTheScreen();
  expect(screen.getByText('Đã nhận (0)')).toBeOnTheScreen();
  expect(screen.getByText('Đã gửi (0)')).toBeOnTheScreen();
  expect(listRequests()).toHaveLength(2);
});

test('refresh failure preserves loaded rows and exposes a retry', async () => {
  apiMock.onGet('/friends/requests').reply(200, payload);
  await openNotifications();
  await screen.findByText('Linh Nguyễn');
  apiMock.onGet('/friends/requests').networkError();
  await fireEvent(screen.getByTestId('friend-requests-list'), 'refresh');
  await screen.findByRole('button', { name: 'Thử làm mới' });
  expect(screen.getByText('Linh Nguyễn')).toBeOnTheScreen();
  apiMock.onGet('/friends/requests').reply(200, { received: [], sent: [] });
  await fireEvent.press(screen.getByRole('button', { name: 'Thử làm mới' }));
  expect(await screen.findByText('Chưa có lời mời đã nhận')).toBeOnTheScreen();
});

test('refocus fetches fresh data and ignores an earlier canceled response', async () => {
  let finishOld: (() => void) | undefined;
  apiMock.onGet('/friends/requests').replyOnce(
    () =>
      new Promise<[number, object]>(resolve => {
        finishOld = () => resolve([200, payload]);
      }),
  );
  await openNotifications();
  await screen.findByLabelText('Đang tải lời mời kết bạn');
  await fireEvent.press(screen.getByTestId('tab-profile'));
  apiMock
    .onGet('/friends/requests')
    .reply(200, { received: [{ ...received, from: minh }], sent: [] });
  await fireEvent.press(screen.getByTestId('tab-notifications'));
  await screen.findByText('Minh Anh');
  await act(() => finishOld?.());
  expect(screen.queryByText('Linh Nguyễn')).toBeNull();
  expect(listRequests()).toHaveLength(2);
});

test('deleted users render a fallback instead of breaking the request list', async () => {
  apiMock
    .onGet('/friends/requests')
    .reply(200, { received: [{ ...received, from: null }], sent: [] });
  await openNotifications();
  expect(
    await screen.findByText('Tài khoản không còn tồn tại'),
  ).toBeOnTheScreen();
});

test.each([
  { sent: [] },
  { sent: [], received: [{ ...received, createdAt: 'invalid-date' }] },
  { sent: [{ ...sent, to: { _id: minh._id } }], received: [] },
])(
  'malformed responses are rejected rather than displayed as empty lists: %#',
  async body => {
    apiMock.onGet('/friends/requests').reply(200, body);
    await expect(getFriendRequests()).rejects.toMatchObject({
      message:
        'Danh sách lời mời kết bạn trả về không hợp lệ. Vui lòng thử lại.',
    });
  },
);

test('accept calls the receiver API, removes the invitation and shows friendship on the friends tab', async () => {
  let current = payload;
  apiMock.onGet('/friends/requests').reply(() => [200, current]);
  apiMock.onPost('/friends/requests/request-in/accept').reply(() => {
    current = { ...payload, received: [] };
    return [200, { newFriend: linh }];
  });
  apiMock.onGet('/users').reply(200, {
    users: [{ ...linh, friendshipStatus: 'friends' }],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
  await openNotifications();
  await fireEvent.press(
    await screen.findByRole('button', {
      name: 'Đồng ý kết bạn với Linh Nguyễn',
    }),
  );
  expect(
    await screen.findByText('Đã kết bạn với Linh Nguyễn.'),
  ).toBeOnTheScreen();
  expect(await screen.findByText('Đã nhận (0)')).toBeOnTheScreen();
  expect(screen.getByText('Đã gửi (1)')).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'Đồng ý kết bạn với Linh Nguyễn' }),
  ).toBeNull();
  expect(apiMock.history.post[0]).toMatchObject({
    url: '/friends/requests/request-in/accept',
    headers: expect.objectContaining({
      Authorization: 'Bearer test-access-token',
    }),
  });
  await fireEvent.press(screen.getByTestId('tab-friends'));
  expect(
    await screen.findByLabelText('Đã là bạn bè với Linh Nguyễn'),
  ).toBeOnTheScreen();
});

test('decline accepts a 204 response and removes only the received request', async () => {
  let current = payload;
  apiMock.onGet('/friends/requests').reply(() => [200, current]);
  apiMock.onPost('/friends/requests/request-in/decline').reply(() => {
    current = { ...payload, received: [] };
    return [204];
  });
  await openNotifications();
  await fireEvent.press(
    await screen.findByRole('button', {
      name: 'Từ chối lời mời từ Linh Nguyễn',
    }),
  );
  expect(
    await screen.findByText('Đã từ chối lời mời từ Linh Nguyễn.'),
  ).toBeOnTheScreen();
  expect(await screen.findByText('Đã nhận (0)')).toBeOnTheScreen();
  expect(screen.getByText('Đã gửi (1)')).toBeOnTheScreen();
  expect(apiMock.history.post[0].url).toBe(
    '/friends/requests/request-in/decline',
  );
});

test('sent requests do not expose receiver actions', async () => {
  apiMock.onGet('/friends/requests').reply(200, payload);
  await openNotifications();
  await screen.findByText('Linh Nguyễn');
  await fireEvent.press(screen.getByRole('tab', { name: 'Lời mời đã gửi' }));
  await screen.findByText('Minh Anh');
  expect(
    screen.queryByRole('button', { name: /Đồng ý kết bạn|Từ chối lời mời/ }),
  ).toBeNull();
  expect(apiMock.history.post).toHaveLength(0);
});

test('both actions are locked on a pending row while other invitations remain actionable', async () => {
  let finish: (() => void) | undefined;
  const other = { ...received, _id: 'request-other', from: minh };
  let current = { ...payload, received: [received, other] };
  apiMock.onGet('/friends/requests').reply(() => [200, current]);
  apiMock.onPost('/friends/requests/request-in/accept').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => {
          current = { ...current, received: [other] };
          resolve([200, { newFriend: linh }]);
        };
      }),
  );
  await openNotifications();
  await fireEvent.press(
    await screen.findByRole('button', {
      name: 'Đồng ý kết bạn với Linh Nguyễn',
    }),
  );
  const accept = screen.getByRole('button', {
    name: 'Đồng ý kết bạn với Linh Nguyễn',
  });
  const decline = screen.getByRole('button', {
    name: 'Từ chối lời mời từ Linh Nguyễn',
  });
  expect(accept).toBeDisabled();
  expect(decline).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Đồng ý kết bạn với Minh Anh' }),
  ).toBeEnabled();
  await fireEvent.press(accept);
  await fireEvent.press(decline);
  expect(apiMock.history.post).toHaveLength(1);
  await act(() => finish?.());
  expect(await screen.findByText('Đã nhận (1)')).toBeOnTheScreen();
  expect(screen.getByText('Minh Anh')).toBeOnTheScreen();
});

test.each(['accept', 'decline'] as const)(
  'a failed %s preserves the invitation and allows retry',
  async action => {
    let current = payload;
    const path = `/friends/requests/request-in/${action}`;
    apiMock.onGet('/friends/requests').reply(() => [200, current]);
    apiMock.onPost(path).networkErrorOnce();
    apiMock.onPost(path).reply(() => {
      current = { ...payload, received: [] };
      return action === 'accept' ? [200, { newFriend: linh }] : [204];
    });
    await openNotifications();
    const name =
      action === 'accept'
        ? 'Đồng ý kết bạn với Linh Nguyễn'
        : 'Từ chối lời mời từ Linh Nguyễn';
    await fireEvent.press(await screen.findByRole('button', { name }));
    await screen.findByText(
      'Không thể kết nối máy chủ. Kiểm tra kết nối mạng và thử lại.',
    );
    expect(screen.getByText('Linh Nguyễn')).toBeOnTheScreen();
    expect(screen.getByText('Đã nhận (1)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name })).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name }));
    expect(await screen.findByText('Đã nhận (0)')).toBeOnTheScreen();
    expect(apiMock.history.post).toHaveLength(2);
  },
);

test('a request already handled elsewhere refreshes the list and shows the error without false success', async () => {
  let current = payload;
  apiMock.onGet('/friends/requests').reply(() => [200, current]);
  apiMock.onPost('/friends/requests/request-in/decline').reply(() => {
    current = { ...payload, received: [] };
    return [404, { message: 'Lời mời đã được xử lý trước đó' }];
  });
  await openNotifications();
  await fireEvent.press(
    await screen.findByRole('button', {
      name: 'Từ chối lời mời từ Linh Nguyễn',
    }),
  );
  expect(
    await screen.findByText('Lời mời đã được xử lý trước đó'),
  ).toBeOnTheScreen();
  expect(await screen.findByText('Đã nhận (0)')).toBeOnTheScreen();
  expect(screen.queryByText('Đã từ chối lời mời từ Linh Nguyễn.')).toBeNull();
});

test('an invitation from a deleted user can be declined but cannot be accepted', async () => {
  let current = { ...payload, received: [{ ...received, from: null }] };
  apiMock.onGet('/friends/requests').reply(() => [200, current]);
  apiMock.onPost('/friends/requests/request-in/decline').reply(() => {
    current = { ...payload, received: [] };
    return [204];
  });
  await openNotifications();
  expect(
    await screen.findByRole('button', {
      name: 'Đồng ý kết bạn với Tài khoản không còn tồn tại',
    }),
  ).toBeDisabled();
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Từ chối lời mời từ Tài khoản không còn tồn tại',
    }),
  );
  expect(await screen.findByText('Đã nhận (0)')).toBeOnTheScreen();
  expect(apiMock.history.post).toHaveLength(1);
});

test('a GET started before acceptance cannot restore the processed invitation', async () => {
  let finishOld: (() => void) | undefined;
  apiMock.onGet('/friends/requests').replyOnce(200, payload);
  apiMock.onGet('/friends/requests').replyOnce(
    () =>
      new Promise<[number, object]>(resolve => {
        finishOld = () => resolve([200, payload]);
      }),
  );
  apiMock
    .onPost('/friends/requests/request-in/accept')
    .reply(200, { newFriend: linh });
  await openNotifications();
  await screen.findByText('Linh Nguyễn');
  await fireEvent(screen.getByTestId('friend-requests-list'), 'refresh');
  apiMock.onGet('/friends/requests').reply(200, { ...payload, received: [] });
  await fireEvent.press(
    screen.getByRole('button', { name: 'Đồng ý kết bạn với Linh Nguyễn' }),
  );
  await screen.findByText('Đã nhận (0)');
  await act(() => finishOld?.());
  expect(screen.queryByText('Linh Nguyễn')).toBeNull();
  expect(screen.getByText('Đã nhận (0)')).toBeOnTheScreen();
});

test('malformed acceptance success is shown as an error and does not remove the invitation', async () => {
  apiMock.onGet('/friends/requests').reply(200, payload);
  apiMock.onPost('/friends/requests/request-in/accept').reply(200, {});
  await openNotifications();
  await fireEvent.press(
    await screen.findByRole('button', {
      name: 'Đồng ý kết bạn với Linh Nguyễn',
    }),
  );
  expect(
    await screen.findByText(
      'Không thể xác nhận kết bạn thành công. Vui lòng làm mới danh sách.',
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText('Đã nhận (1)')).toBeOnTheScreen();
  expect(screen.getByText('Linh Nguyễn')).toBeOnTheScreen();
});
