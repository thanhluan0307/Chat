import axios from 'axios';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Convert transport errors into UI-safe messages without retaining credential-bearing request config. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError<unknown>(error)) {
    const status = error.response?.status ?? 0;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(
        'Yêu cầu quá thời gian chờ. Vui lòng thử lại.',
        status,
        error.code,
      );
    }
    if (
      error.code === 'ERR_BAD_RESPONSE' &&
      error.cause instanceof SyntaxError
    ) {
      return new ApiError(
        'Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.',
        status,
        error.code,
      );
    }
    if (status >= 500) {
      return new ApiError(
        'Máy chủ đang bận. Vui lòng thử lại sau.',
        status,
        error.code,
      );
    }
    if (status > 0) {
      const data = error.response?.data;
      const message =
        data &&
        typeof data === 'object' &&
        'message' in data &&
        typeof data.message === 'string'
          ? data.message
          : 'Không thể thực hiện yêu cầu. Vui lòng thử lại.';
      return new ApiError(message, status, error.code);
    }
  }
  return new ApiError(
    'Không thể kết nối máy chủ. Kiểm tra kết nối mạng và thử lại.',
    0,
  );
}
