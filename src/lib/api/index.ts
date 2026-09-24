import axios, { type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = 'http://localhost:3001';

const CSRF_METHODS = new Set([
  'post',
  'put',
  'patch',
  'delete',
]);

export const Api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

let csrfToken: string | null = null;

const getCsrfToken = async (): Promise<string | null> => {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await Api.get('/api/v1/auth/csrf');

  csrfToken = response.data.csrfToken;

  return csrfToken;
};

Api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase();

    if (method && CSRF_METHODS.has(method)) {
      const token = await getCsrfToken();

      config.headers.set('X-CSRF-TOKEN', token);
    }

    return config;
  },
);

export const clearCsrfToken = () => {
  csrfToken = null;
};
