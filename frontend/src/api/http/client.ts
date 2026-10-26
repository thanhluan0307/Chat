import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { ApiError, toApiError } from './errors';

type AccessTokenProvider = () => string | undefined;
let getAccessToken: AccessTokenProvider = () => undefined;

/** Register a live token reader; the returned cleanup removes only this reader. */
export function registerAccessTokenProvider(
  provider: AccessTokenProvider,
): () => void {
  getAccessToken = provider;
  return () => {
    if (getAccessToken === provider) getAccessToken = () => undefined;
  };
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  allowAbsoluteUrls: false,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  responseType: 'json',
  transitional: { silentJSONParsing: false, clarifyTimeoutError: true },
});

httpClient.interceptors.request.use(config => {
  if (!config.baseURL) {
    throw new ApiError('Dịch vụ chưa sẵn sàng. Vui lòng thử lại sau.', 0);
  }
  const token = getAccessToken();
  // An explicit token is used for the profile check before a session is committed.
  if (token && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

httpClient.interceptors.response.use(
  response => response,
  (error: unknown) => {
    // Preserve cancellation so callers can distinguish it from a failed request.
    if (axios.isCancel(error)) return Promise.reject(error);
    return Promise.reject(toApiError(error));
  },
);
