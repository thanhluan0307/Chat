import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import { io } from 'socket.io-client';
import App from '../App';
import { httpClient } from '../src/api/http';
import { SOCKET_URL } from '../src/config/api';
import { saveSession } from '../src/storage/sessionStorage';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
const ioMock = jest.mocked(io);
const user = {
  _id: '64b000000000000000000001',
  username: 'luan',
  displayName: 'Thanh Luân',
  email: 'luan@example.com',
};
const saved = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  user,
};
type MockSocket = {
  id: string;
  connect: jest.Mock;
  disconnect: jest.Mock;
  removeAllListeners: jest.Mock;
  receive: (event: string, value?: unknown) => void;
};
/** Lấy instance socket mới nhất do UI test tạo ra. */
function lastSocket(): MockSocket {
  return ioMock.mock.results.at(-1)?.value as unknown as MockSocket;
}
beforeEach(() => {
  apiMock.reset();
  ioMock.mockClear();
  apiMock.onGet('/users/me').reply(200, { user });
  apiMock.onGet('/conversations').reply(200, { conversations: [] });
});
afterAll(() => apiMock.restore());

/** Không mở một socket ẩn danh trước khi người dùng đăng nhập. */
test('there is no connection on the login screen', async () => {
  await render(<App />);
  await screen.findByLabelText('Tên đăng nhập');
  expect(ioMock).not.toHaveBeenCalled();
});

/** Khôi phục phiên cần xác nhận profile xong rồi mới bắt tay bằng JWT. */
test('restored session connects only after verification and exposes connection logs', async () => {
  let finish: (() => void) | undefined;
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  apiMock.onGet('/users/me').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => resolve([200, { user }]);
      }),
  );
  await saveSession(saved);
  await render(<App />);
  expect(ioMock).not.toHaveBeenCalled();
  await act(() => finish?.());
  await screen.findByTestId('tab-chats');
  expect(ioMock).toHaveBeenCalledWith(
    SOCKET_URL,
    expect.objectContaining({
      auth: { token: saved.accessToken },
      autoConnect: false,
      forceNew: true,
    }),
  );
  expect(lastSocket().connect).toHaveBeenCalledTimes(1);
  await act(() => lastSocket().receive('connect'));
  expect(info).toHaveBeenCalledWith(
    '[socket] FE đã kết nối BE:',
    'socket-test-id',
  );
  info.mockRestore();
});

/** Khi cơ chế HTTP có sẵn refresh JWT, effect tự thay đúng kết nối cũ. */
test('token changes disconnect the old socket and connect with the refreshed token', async () => {
  apiMock.onGet('/check-session').replyOnce(403, {});
  apiMock.onGet('/check-session').reply(200, {});
  apiMock
    .onPost('/auth/refresh')
    .reply(200, { accessToken: 'new-access-token' });
  await saveSession(saved);
  await render(<App />);
  await screen.findByTestId('tab-chats');
  const previous = lastSocket();
  await act(async () => {
    await httpClient.get('/check-session');
  });
  await waitFor(() =>
    expect(ioMock.mock.calls.at(-1)?.[1]?.auth).toEqual({
      token: 'new-access-token',
    }),
  );
  expect(previous.disconnect).toHaveBeenCalledTimes(1);
  expect(previous.removeAllListeners).toHaveBeenCalledTimes(1);
  expect(lastSocket().connect).toHaveBeenCalledTimes(1);
});

/** Logout không được để socket hoặc listener mang JWT cũ tiếp tục chạy. */
test('logout disconnects and removes the session socket listeners', async () => {
  apiMock.onPost('/auth/signout').reply(204);
  await saveSession(saved);
  await render(<App />);
  await screen.findByTestId('tab-chats');
  const previous = lastSocket();
  await fireEvent.press(screen.getByTestId('tab-profile'));
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
  await screen.findByLabelText('Tên đăng nhập');
  expect(previous.disconnect).toHaveBeenCalledTimes(1);
  expect(previous.removeAllListeners).toHaveBeenCalledTimes(1);
});
