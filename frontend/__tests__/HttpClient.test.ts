import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  ApiError,
  httpClient,
  registerAccessTokenProvider,
} from '../src/api/http';

const apiMock = new MockAdapter(httpClient, { onNoMatch: 'throwException' });
beforeEach(() => apiMock.reset());
afterAll(() => apiMock.restore());

test('reads the current token per request, preserves explicit headers, and removes its reader on cleanup', async () => {
  let token: string | undefined = 'first-test-token';
  const unregister = registerAccessTokenProvider(() => token);
  apiMock.onGet('/probe').reply(200, {});
  try {
    await httpClient.get('/probe');
    expect(apiMock.history.get[0]).toMatchObject({
      timeout: 15000,
      withCredentials: true,
      headers: expect.objectContaining({
        Authorization: 'Bearer first-test-token',
        Accept: 'application/json',
      }),
    });
    await httpClient.get('/probe', {
      headers: { Authorization: 'Bearer explicit-test-token' },
    });
    expect(apiMock.history.get[1].headers?.Authorization).toBe(
      'Bearer explicit-test-token',
    );
    token = undefined;
    await httpClient.get('/probe');
    expect(apiMock.history.get[2].headers?.Authorization).toBeUndefined();
  } finally {
    unregister();
  }
  await httpClient.get('/probe');
  expect(apiMock.history.get[3].headers?.Authorization).toBeUndefined();
});

test('normalizes server errors without exposing server details or request config', async () => {
  apiMock.onGet('/probe').reply(503, { message: 'internal server details' });
  const request = httpClient.get('/probe');
  await expect(request).rejects.toBeInstanceOf(ApiError);
  await expect(request).rejects.toMatchObject({
    status: 503,
    message: 'Máy chủ đang bận. Vui lòng thử lại sau.',
  });
  await expect(request).rejects.not.toHaveProperty('config');
});

test('distinguishes timeouts from an ordinary network failure', async () => {
  apiMock.onGet('/probe').timeoutOnce();
  await expect(httpClient.get('/probe')).rejects.toMatchObject({
    status: 0,
    message: 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.',
  });
});

test('rejects malformed JSON instead of treating it as a successful API result', async () => {
  apiMock.onGet('/probe').replyOnce(200, '{invalid-json');
  await expect(httpClient.get('/probe')).rejects.toMatchObject({
    message: 'Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.',
  });
});

test('preserves cancellation instead of presenting it as a network error', async () => {
  const controller = new AbortController();
  controller.abort();
  const error = await httpClient
    .get('/probe', { signal: controller.signal })
    .catch((failure: unknown) => failure);
  expect(axios.isCancel(error)).toBe(true);
  expect(error).not.toBeInstanceOf(ApiError);
});
