import { fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import App from '../App';
import { httpClient } from '../src/api/http';
import { navigationRef } from '../src/navigation/navigationRef';
import { RouteName } from '../src/navigation/routes';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });

async function openRegistration() {
  await render(<App />);
  await fireEvent.press(screen.getByRole('button', { name: 'Mở màn đăng ký' }));
  await screen.findByText('Tạo tài khoản mới');
}

async function fillRegistration() {
  await fireEvent.changeText(
    screen.getByLabelText('Họ và tên đệm'),
    ' Nguyễn Thanh ',
  );
  await fireEvent.changeText(screen.getByLabelText('Tên'), ' Luân ');
  await fireEvent.changeText(screen.getByLabelText('Tên đăng nhập'), ' LUAN ');
  await fireEvent.changeText(
    screen.getByLabelText('Email'),
    ' LUAN@Example.com ',
  );
  await fireEvent.changeText(
    screen.getByLabelText('Mật khẩu'),
    ' password-for-test ',
  );
  await fireEvent.changeText(
    screen.getByLabelText('Xác nhận mật khẩu'),
    ' password-for-test ',
  );
}

beforeEach(() => apiMock.reset());
afterAll(() => apiMock.restore());

test('registration is outside the tabs and requires every account field', async () => {
  await openRegistration();
  expect(navigationRef.getCurrentRoute()?.name).toBe(RouteName.Register);
  expect(screen.queryByTestId('tab-chats')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  for (const message of [
    'Vui lòng nhập họ và tên đệm.',
    'Vui lòng nhập tên.',
    'Vui lòng nhập tên đăng nhập.',
    'Vui lòng nhập email.',
    'Vui lòng nhập mật khẩu.',
    'Vui lòng xác nhận mật khẩu.',
  ]) {
    expect(await screen.findByText(message)).toBeOnTheScreen();
  }
  expect(apiMock.history.post).toHaveLength(0);
});

test('invalid email and mismatched confirmation never reach the API', async () => {
  await openRegistration();
  await fillRegistration();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
  await fireEvent.changeText(
    screen.getByLabelText('Xác nhận mật khẩu'),
    'different-password',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  expect(await screen.findByText('Email không hợp lệ.')).toBeOnTheScreen();
  expect(
    await screen.findByText('Mật khẩu xác nhận không khớp.'),
  ).toBeOnTheScreen();
  expect(apiMock.history.post).toHaveLength(0);
});

test('a changed password invalidates a previously matching confirmation', async () => {
  await openRegistration();
  await fillRegistration();
  await fireEvent.changeText(
    screen.getByLabelText('Mật khẩu'),
    'new-password-for-test',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  expect(
    await screen.findByText('Mật khẩu xác nhận không khớp.'),
  ).toBeOnTheScreen();
  expect(apiMock.history.post).toHaveLength(0);
});

test('a duplicate username is shown on the form and does not start a session', async () => {
  apiMock
    .onPost('/auth/signup')
    .replyOnce(409, { message: 'username đã tồn tại' });
  await openRegistration();
  await fillRegistration();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  expect(await screen.findByText('username đã tồn tại')).toBeOnTheScreen();
  expect(navigationRef.getCurrentRoute()?.name).toBe(RouteName.Register);
  expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeEnabled();
  expect(screen.queryByTestId('tab-chats')).toBeNull();
});

test('successful signup sends only API fields and returns to a password-free login form', async () => {
  apiMock.onPost('/auth/signup').replyOnce(204);
  await openRegistration();
  await fillRegistration();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  expect(
    await screen.findByText('Đăng ký thành công. Đăng nhập để tiếp tục.'),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText('Tên đăng nhập')).toHaveProp('value', 'luan');
  expect(screen.getByLabelText('Mật khẩu')).toHaveProp('value', '');
  expect(screen.queryByTestId('tab-chats')).toBeNull();
  expect(navigationRef.canGoBack()).toBe(false);
  expect(navigationRef.getCurrentRoute()?.params).toEqual({
    registeredUsername: 'luan',
  });
  expect(apiMock.history.post).toHaveLength(1);
  expect(apiMock.history.post[0]).toMatchObject({
    url: '/auth/signup',
    data: JSON.stringify({
      username: 'luan',
      password: ' password-for-test ',
      email: 'luan@example.com',
      firstName: 'Luân',
      lastName: 'Nguyễn Thanh',
    }),
  });
});
