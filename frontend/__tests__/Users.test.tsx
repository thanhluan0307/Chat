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
const linh = { _id: 'other-1', username: 'linh', displayName: 'Linh Nguyễn' };
const minh = { _id: 'other-2', username: 'minh', displayName: 'Minh Anh' };

function page(users: (typeof linh)[], number = 1, total = users.length) {
  const totalPages = Math.ceil(total / 20);
  return {
    users,
    pagination: {
      page: number,
      limit: 20,
      total,
      totalPages,
      hasNextPage: number < totalPages,
      hasPreviousPage: number > 1 && total > 0,
    },
  };
}
async function openUsers() {
  await render(<App />);
  await fireEvent.changeText(screen.getByLabelText('Tên đăng nhập'), 'luan');
  await fireEvent.changeText(
    screen.getByLabelText('Mật khẩu'),
    'password-for-test',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await fireEvent.press(await screen.findByTestId('tab-friends'));
}
function requestedPages() {
  return apiMock.history.get
    .filter(item => item.url === '/users')
    .map(item => item.params.page);
}

beforeEach(() => {
  apiMock.reset();
  apiMock.onPost('/auth/signin').replyOnce(200, {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
  });
  apiMock.onGet('/users/me').replyOnce(200, { user });
  apiMock.onGet('/conversations').reply(200, { conversations: [] });
});
afterAll(() => apiMock.restore());

test('the directory requests page one with authentication and renders public names', async () => {
  apiMock
    .onGet('/users', { params: { page: 1, limit: 20 } })
    .reply(200, page([linh]));
  await openUsers();
  expect(await screen.findByText('Linh Nguyễn')).toBeOnTheScreen();
  expect(screen.getByText('@linh')).toBeOnTheScreen();
  const request = apiMock.history.get.find(item => item.url === '/users');
  expect(request).toMatchObject({
    params: { page: 1, limit: 20 },
    headers: expect.objectContaining({
      Authorization: 'Bearer test-access-token',
    }),
  });
  expect(screen.queryByText('luan@example.com')).toBeNull();
});

test('an empty directory shows a no-data state', async () => {
  apiMock.onGet('/users').reply(200, page([]));
  await openUsers();
  expect(await screen.findByText('Chưa có người dùng khác')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Tải thêm' })).toBeNull();
});

test('next pages append users once and loading stops at the final page', async () => {
  apiMock
    .onGet('/users', { params: { page: 1, limit: 20 } })
    .reply(200, page([linh], 1, 21));
  apiMock
    .onGet('/users', { params: { page: 2, limit: 20 } })
    .reply(200, page([linh, minh], 2, 21));
  await openUsers();
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Tải thêm' }),
  );
  expect(await screen.findByText('Minh Anh')).toBeOnTheScreen();
  expect(screen.getAllByText('Linh Nguyễn')).toHaveLength(1);
  expect(screen.getByText('Đã hiển thị tất cả người dùng')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Tải thêm' })).toBeNull();
  expect(requestedPages()).toEqual([1, 2]);
});

test('a next-page failure preserves rows and retries the same page', async () => {
  apiMock
    .onGet('/users', { params: { page: 1, limit: 20 } })
    .reply(200, page([linh], 1, 21));
  apiMock
    .onGet('/users', { params: { page: 2, limit: 20 } })
    .replyOnce(503, {});
  apiMock
    .onGet('/users', { params: { page: 2, limit: 20 } })
    .reply(200, page([minh], 2, 21));
  await openUsers();
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Tải thêm' }),
  );
  await screen.findByRole('button', { name: 'Thử tải lại' });
  expect(screen.getByText('Linh Nguyễn')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử tải lại' }));
  expect(await screen.findByText('Minh Anh')).toBeOnTheScreen();
  expect(requestedPages()).toEqual([1, 2, 2]);
});

test('repeated end events cannot send concurrent requests for the same page', async () => {
  let finish: (() => void) | undefined;
  apiMock
    .onGet('/users', { params: { page: 1, limit: 20 } })
    .reply(200, page([linh], 1, 21));
  apiMock.onGet('/users', { params: { page: 2, limit: 20 } }).reply(
    () =>
      new Promise<[number, ReturnType<typeof page>]>(resolve => {
        finish = () => resolve([200, page([minh], 2, 21)]);
      }),
  );
  await openUsers();
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Tải thêm' }),
  );
  await screen.findByLabelText('Đang tải thêm người dùng');
  await fireEvent(screen.getByTestId('users-list'), 'endReached', {
    distanceFromEnd: 0,
  });
  await fireEvent(screen.getByTestId('users-list'), 'endReached', {
    distanceFromEnd: 0,
  });
  expect(requestedPages()).toEqual([1, 2]);
  await act(() => finish?.());
  expect(await screen.findByText('Minh Anh')).toBeOnTheScreen();
});

test('refresh resets page one and an older page cannot overwrite it', async () => {
  let finishOld: (() => void) | undefined;
  apiMock
    .onGet('/users', { params: { page: 1, limit: 20 } })
    .reply(200, page([linh], 1, 21));
  apiMock.onGet('/users', { params: { page: 2, limit: 20 } }).reply(
    () =>
      new Promise<[number, ReturnType<typeof page>]>(resolve => {
        finishOld = () => resolve([200, page([linh], 2, 21)]);
      }),
  );
  await openUsers();
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Tải thêm' }),
  );
  await screen.findByLabelText('Đang tải thêm người dùng');
  apiMock
    .onGet('/users', { params: { page: 1, limit: 20 } })
    .reply(200, page([minh]));
  await fireEvent(screen.getByTestId('users-list'), 'refresh');
  await screen.findByText('Minh Anh');
  await act(() => finishOld?.());
  expect(screen.queryByText('Linh Nguyễn')).toBeNull();
  expect(requestedPages()).toEqual([1, 2, 1]);
});

test('invalid pagination is shown as a failure instead of an empty directory', async () => {
  apiMock.onGet('/users').reply(200, { users: [], pagination: {} });
  await openUsers();
  expect(
    await screen.findByText('Không tải được người dùng'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có người dùng khác')).toBeNull();
});

test('search is debounced, resets pagination and preserves its query when loading more', async () => {
  apiMock
    .onGet('/users')
    .reply(config => [
      200,
      config.params.search
        ? page(
            config.params.page === 1 ? [minh] : [linh],
            config.params.page,
            21,
          )
        : page([linh]),
    ]);
  await openUsers();
  await screen.findByText('Linh Nguyễn');
  const before = requestedPages().length;
  await fireEvent.changeText(screen.getByLabelText('Tìm bạn'), 'Mi');
  await fireEvent.changeText(screen.getByLabelText('Tìm bạn'), '  Minh  ');
  expect(requestedPages()).toHaveLength(before);
  await screen.findByText('Minh Anh');
  const searches = () =>
    apiMock.history.get.filter(
      item => item.url === '/users' && item.params.search,
    );
  expect(searches()).toHaveLength(1);
  expect(searches()[0].params).toEqual({ page: 1, limit: 20, search: 'Minh' });
  await fireEvent.press(screen.getByRole('button', { name: 'Tải thêm' }));
  await screen.findByText('Linh Nguyễn');
  expect(searches()[1].params).toEqual({ page: 2, limit: 20, search: 'Minh' });
  await fireEvent.changeText(screen.getByLabelText('Tìm bạn'), '');
  await screen.findByText('Đã hiển thị tất cả người dùng');
  expect(
    apiMock.history.get.filter(item => item.url === '/users').at(-1)?.params,
  ).toEqual({ page: 1, limit: 20 });
});

test('search with no matches shows its own empty state', async () => {
  apiMock
    .onGet('/users')
    .reply(config => [200, page(config.params.search ? [] : [linh])]);
  await openUsers();
  await screen.findByText('Linh Nguyễn');
  await fireEvent.changeText(screen.getByLabelText('Tìm bạn'), 'nobody');
  expect(
    await screen.findByText('Không tìm thấy người dùng'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có người dùng khác')).toBeNull();
});

test('a delayed older search cannot replace the latest results', async () => {
  let finish: (() => void) | undefined;
  apiMock.onGet('/users').reply(config => {
    if (config.params.search === 'linh')
      return new Promise<[number, object]>(resolve => {
        finish = () => resolve([200, page([linh])]);
      });
    return [200, page(config.params.search ? [minh] : [linh])];
  });
  await openUsers();
  await screen.findByText('Linh Nguyễn');
  await fireEvent.changeText(screen.getByLabelText('Tìm bạn'), 'linh');
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 350));
  });
  expect(finish).toBeDefined();
  await fireEvent.changeText(screen.getByLabelText('Tìm bạn'), 'minh');
  await screen.findByText('Minh Anh');
  await act(() => finish?.());
  expect(screen.queryByText('Linh Nguyễn')).toBeNull();
});
