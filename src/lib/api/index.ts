import axios from 'axios';
import type { ApiErrorBody } from '../../types/api';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const Api = axios.create({
  withCredentials: true,
});

Api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const statusCode = error.response?.status ?? 0;
    const responseBody = error.response?.data;
    const body =
      responseBody && typeof responseBody === 'object'
        ? (responseBody as ApiErrorBody)
        : undefined;
    const message = body?.message
      ? Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message
      : error.message;

    return Promise.reject(new ApiError(statusCode, message, body));
  },
);