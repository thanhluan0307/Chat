import axios, { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../../config/api';
import { ApiError, toApiError } from './errors';

type AccessTokenProvider = () => string | undefined;
let getAccessToken: AccessTokenProvider = () => undefined;
type RefreshHandler = () => Promise<string>;
let refreshAccessToken: RefreshHandler | undefined;
let getSessionRevision: () => number | undefined = () => undefined;
interface SessionRequest extends InternalAxiosRequestConfig {
  sessionRetried?: boolean;
  sessionRevision?: number;
  usesSession?: boolean;
}

export function registerSessionRefresh(
  handler: RefreshHandler,
  revision: () => number,
): () => void {
  refreshAccessToken = handler;
  getSessionRevision = revision;
  return () => {
    if (refreshAccessToken === handler) {
      refreshAccessToken = undefined;
      getSessionRevision = () => undefined;
    }
  };
}

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
  const request = config as SessionRequest;
  if (request.usesSession === undefined) {
    request.usesSession =
      !!token && config.headers.get('Authorization') === `Bearer ${token}`;
    request.sessionRevision = getSessionRevision();
  }
  return config;
});

httpClient.interceptors.response.use(
  response => response,
  async (error: unknown) => {
    // Preserve cancellation so callers can distinguish it from a failed request.
    if (axios.isCancel(error)) return Promise.reject(error);
    if (axios.isAxiosError(error) && error.config) {
      const config = error.config as SessionRequest;
      const token = getAccessToken();
      if (
        [401, 403].includes(error.response?.status ?? 0) &&
        !config.url?.startsWith('/auth/') &&
        !config.sessionRetried &&
        token &&
        refreshAccessToken &&
        config.usesSession &&
        config.sessionRevision === getSessionRevision()
      ) {
        // Another response may already have refreshed this same session.
        const refreshed =
          config.headers.get('Authorization') === `Bearer ${token}`
            ? await refreshAccessToken()
            : token;
        if (config.signal?.aborted) throw new axios.CanceledError();
        if (
          config.sessionRevision !== getSessionRevision() ||
          !getAccessToken()
        )
          throw new ApiError('Phiên đã kết thúc.', 401);
        const retry = {
          ...config,
          sessionRetried: true,
          headers: new AxiosHeaders(config.headers),
        };
        retry.headers.set('Authorization', `Bearer ${refreshed}`);
        return httpClient.request(retry);
      }
    }
    return Promise.reject(toApiError(error));
  },
);
