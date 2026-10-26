import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import App from '../App';
import { httpClient } from '../src/api/http';
import { navigationRef } from '../src/navigation/navigationRef';
import { RouteName } from '../src/navigation/routes';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
const user = {
  _id: 'user-1',
  username: 'luan',
  displayName: 'Thanh Luân',
  email: 'luan@example.com',
};

function allowLogin() {
  apiMock
    .onPost('/auth/signin')
    .replyOnce(200, { accessToken: 'test-access-token' });
  apiMock.onGet('/users/me').replyOnce(200, { user });
  apiMock.onGet('/conversations').reply(200, {
    conversations: [
      {
        _id: 'conversation-linh',
        type: 'direct',
        participants: [
          { _id: user._id, displayName: user.displayName },
          { _id: 'friend-1', displayName: 'Linh Nguyễn' },
        ],
        lastMessage: null,
        unreadCounts: {},
      },
    ],
  });
}
async function submitLogin() {
  await fireEvent.changeText(
    screen.getByLabelText('Tên đăng nhập'),
    '  LUAN  ',
  );
  await fireEvent.changeText(
    screen.getByLabelText('Mật khẩu'),
    'password-for-test',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
}
beforeEach(() => apiMock.reset());
afterAll(() => apiMock.restore());

test('requires credentials and exposes no guest entry or protected routes', async () => {
  await render(<App />);
  expect(screen.queryByText(/tài khoản khách/i)).toBeNull();
  expect(screen.queryByTestId('tab-chats')).toBeNull();
  expect(navigationRef.getRootState()?.routeNames).toEqual([
    RouteName.Login,
    RouteName.Register,
  ]);
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(
    await screen.findByText('Vui lòng nhập tên đăng nhập.'),
  ).toBeOnTheScreen();
  expect(await screen.findByText('Vui lòng nhập mật khẩu.')).toBeOnTheScreen();
  expect(apiMock.history.post).toHaveLength(0);
});

test('a rejected password stays on login and displays the server error', async () => {
  apiMock.onPost('/auth/signin').replyOnce(401, {
    message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
  });
  await render(<App />);
  await submitLogin();
  expect(
    await screen.findByText('Tên đăng nhập hoặc mật khẩu không chính xác.'),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId('tab-chats')).toBeNull();
  expect(apiMock.history.post).toHaveLength(1);
  expect(apiMock.history.post[0]).toMatchObject({
    url: '/auth/signin',
    data: JSON.stringify({ username: 'luan', password: 'password-for-test' }),
  });
});

test('sign-in cannot open the tabs if the token fails the profile check', async () => {
  apiMock
    .onPost('/auth/signin')
    .replyOnce(200, { accessToken: 'unverified-test-token' });
  apiMock
    .onGet('/users/me')
    .replyOnce(403, { message: 'Phiên đăng nhập không hợp lệ.' });
  await render(<App />);
  await submitLogin();
  expect(
    await screen.findByText('Phiên đăng nhập không hợp lệ.'),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId('tab-chats')).toBeNull();
  expect(navigationRef.getCurrentRoute()?.name).toBe(RouteName.Login);
});

test('network failure is visible and keeps the login form available', async () => {
  apiMock.onPost('/auth/signin').networkErrorOnce();
  await render(<App />);
  await submitLogin();
  expect(
    await screen.findByText(
      'Không thể kết nối máy chủ. Kiểm tra kết nối mạng và thử lại.',
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  expect(screen.queryByTestId('tab-chats')).toBeNull();
});

test('verified login opens tabs, preserves selected tabs, and manages drafts with RHF', async () => {
  allowLogin();
  await render(<App />);
  await submitLogin();
  await screen.findByTestId('tab-chats');
  expect(apiMock.history.get[0]).toMatchObject({
    url: '/users/me',
    headers: expect.objectContaining({
      Authorization: 'Bearer test-access-token',
    }),
  });
  await fireEvent.changeText(
    screen.getByLabelText('Tìm cuộc trò chuyện'),
    'không tồn tại',
  );
  expect(
    await screen.findByText('Không tìm thấy cuộc trò chuyện.'),
  ).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Tìm cuộc trò chuyện'), '');
  await fireEvent.press(screen.getByTestId('tab-friends'));
  await fireEvent.press(
    await screen.findByRole('button', {
      name: 'Mở trò chuyện với Linh Nguyễn',
    }),
  );
  expect(navigationRef.getCurrentRoute()?.name).toBe(RouteName.Conversation);
  expect(screen.queryByTestId('tab-friends')).toBeNull();
  expect(screen.getByRole('button', { name: 'Gửi tin nhắn' })).toBeDisabled();
  await fireEvent.changeText(
    screen.getByLabelText('Nội dung tin nhắn'),
    '  Chào bạn!  ',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  expect(screen.getByText('Chào bạn!')).toBeOnTheScreen();
  expect(screen.getByLabelText('Nội dung tin nhắn')).toHaveProp('value', '');
  await act(() => navigationRef.goBack());
  expect(await screen.findByText('Bạn bè của bạn')).toBeOnTheScreen();
});

test('sign-out clears the authenticated session, request token, and navigation history', async () => {
  allowLogin();
  apiMock.onPost('/auth/signout').replyOnce(204);
  apiMock.onGet('/auth-header-check').reply(200, {});
  await render(<App />);
  await submitLogin();
  await fireEvent.press(await screen.findByTestId('tab-profile'));
  expect(await screen.findByText('Thanh Luân')).toBeOnTheScreen();
  expect(screen.getByText('luan@example.com')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
  expect(await screen.findByLabelText('Tên đăng nhập')).toBeOnTheScreen();
  expect(navigationRef.canGoBack()).toBe(false);
  expect(navigationRef.getRootState()?.routeNames).toEqual([
    RouteName.Login,
    RouteName.Register,
  ]);
  expect(apiMock.history.post[1]).toMatchObject({
    url: '/auth/signout',
    withCredentials: true,
    headers: expect.objectContaining({
      Authorization: 'Bearer test-access-token',
    }),
  });
  await httpClient.get('/auth-header-check');
  const headerCheck = apiMock.history.get.find(
    item => item.url === '/auth-header-check',
  );
  expect(headerCheck).toBeDefined();
  expect(headerCheck?.headers?.Authorization).toBeUndefined();
});
