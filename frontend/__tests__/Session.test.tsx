import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import App from '../App';
import { httpClient } from '../src/api/http';
import { readSession, saveSession } from '../src/storage/sessionStorage';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
const saved = {
  accessToken: 'old-test-access',
  refreshToken: 'test-refresh',
  user: {
    _id: 'user-1',
    username: 'luan',
    displayName: 'Thanh Luân',
    email: 'luan@example.com',
  },
};
beforeEach(() => {
  apiMock.reset();
  apiMock.onGet('/conversations').reply(200, { conversations: [] });
  apiMock.onPost('/auth/signout').reply(204);
});
afterAll(() => apiMock.restore());

test('a saved session opens the tabs after remounting without signing in again', async () => {
  await saveSession(saved);
  apiMock.onGet('/users/me').reply(200, { user: saved.user });
  await render(<App />);
  await screen.findByTestId('tab-chats');
  expect(screen.queryByLabelText('Tên đăng nhập')).toBeNull();
  await screen.unmount();
  await render(<App />);
  await screen.findByTestId('tab-chats');
  expect(apiMock.history.post).toHaveLength(0);
  expect(await readSession()).toEqual(saved);
});

test('expired access is refreshed, retried and persisted during startup', async () => {
  await saveSession(saved);
  apiMock.onGet('/users/me').replyOnce(403, {});
  apiMock.onGet('/users/me').reply(200, { user: saved.user });
  apiMock
    .onPost('/auth/refresh')
    .reply(200, { accessToken: 'new-test-access' });
  await render(<App />);
  await screen.findByTestId('tab-chats');
  expect(apiMock.history.post[0].data).toBe(
    JSON.stringify({ client: 'mobile', refreshToken: saved.refreshToken }),
  );
  expect(
    apiMock.history.get
      .filter(item => item.url === '/users/me')
      .map(item => item.headers?.Authorization),
  ).toEqual(['Bearer old-test-access', 'Bearer new-test-access']);
  expect((await readSession())?.accessToken).toBe('new-test-access');
});

test('a revoked refresh token removes persistence and requires login', async () => {
  await saveSession(saved);
  apiMock.onGet('/users/me').reply(403, {});
  apiMock.onPost('/auth/refresh').reply(403, {});
  await render(<App />);
  await screen.findByLabelText('Tên đăng nhập');
  expect(await readSession()).toBeNull();
  expect(screen.queryByTestId('tab-chats')).toBeNull();
  expect(apiMock.history.post).toHaveLength(1);
});

test('being offline at startup keeps the stored session', async () => {
  await saveSession(saved);
  apiMock.onGet('/users/me').networkError();
  await render(<App />);
  await screen.findByTestId('tab-chats');
  expect(await readSession()).toEqual(saved);
});

test('local logout survives a failed server request and another app launch', async () => {
  await saveSession(saved);
  apiMock.onGet('/users/me').reply(200, { user: saved.user });
  apiMock.onPost('/auth/signout').networkError();
  await render(<App />);
  await fireEvent.press(await screen.findByTestId('tab-profile'));
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
  await screen.findByLabelText('Tên đăng nhập');
  expect(await readSession()).toBeNull();
  await screen.unmount();
  await render(<App />);
  await screen.findByLabelText('Tên đăng nhập');
  expect(screen.queryByTestId('tab-chats')).toBeNull();
});

test('concurrent expired requests share one refresh and both retry once', async () => {
  await saveSession(saved);
  apiMock.onGet('/users/me').reply(200, { user: saved.user });
  apiMock.onGet('/one').replyOnce(403, {});
  apiMock.onGet('/two').replyOnce(401, {});
  apiMock.onGet('/one').reply(200, {});
  apiMock.onGet('/two').reply(200, {});
  let finish: (() => void) | undefined;
  apiMock.onPost('/auth/refresh').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => resolve([200, { accessToken: 'refreshed-test-access' }]);
      }),
  );
  await render(<App />);
  await screen.findByTestId('tab-chats');
  const requests = Promise.all([
    httpClient.get('/one'),
    httpClient.get('/two'),
  ]);
  await waitFor(() => expect(finish).toBeDefined());
  expect(apiMock.history.post).toHaveLength(1);
  await act(async () => {
    finish?.();
    await requests;
  });
  expect(
    apiMock.history.get
      .filter(item => ['/one', '/two'].includes(item.url ?? ''))
      .slice(2)
      .map(item => item.headers?.Authorization),
  ).toEqual(['Bearer refreshed-test-access', 'Bearer refreshed-test-access']);
});

test('a late refresh response cannot restore a signed-out session', async () => {
  await saveSession(saved);
  apiMock.onGet('/users/me').reply(200, { user: saved.user });
  apiMock.onGet('/late').reply(403, {});
  let finish: (() => void) | undefined;
  apiMock.onPost('/auth/refresh').reply(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => resolve([200, { accessToken: 'late-test-access' }]);
      }),
  );
  await render(<App />);
  await fireEvent.press(await screen.findByTestId('tab-profile'));
  const request = httpClient.get('/late').catch(() => undefined);
  await waitFor(() => expect(finish).toBeDefined());
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
  await screen.findByLabelText('Tên đăng nhập');
  await act(async () => {
    finish?.();
    await request;
  });
  expect(await readSession()).toBeNull();
  expect(screen.queryByTestId('tab-chats')).toBeNull();
});

test('an older unauthorized response uses the already refreshed token without another refresh', async () => {
  await saveSession(saved);
  apiMock.onGet('/users/me').reply(200, { user: saved.user });
  apiMock.onGet('/quick').replyOnce(403, {});
  apiMock.onGet('/quick').reply(200, {});
  let finish: (() => void) | undefined;
  apiMock.onGet('/slow').replyOnce(
    () =>
      new Promise<[number, object]>(resolve => {
        finish = () => resolve([403, {}]);
      }),
  );
  apiMock.onGet('/slow').reply(200, {});
  apiMock
    .onPost('/auth/refresh')
    .reply(200, { accessToken: 'refreshed-test-access' });
  await render(<App />);
  await screen.findByTestId('tab-chats');
  const slow = httpClient.get('/slow');
  await act(async () => {
    await httpClient.get('/quick');
  });
  await act(async () => {
    finish?.();
    await slow;
  });
  expect(apiMock.history.post).toHaveLength(1);
  expect(
    apiMock.history.get.filter(item => item.url === '/slow').at(-1)?.headers
      ?.Authorization,
  ).toBe('Bearer refreshed-test-access');
});
