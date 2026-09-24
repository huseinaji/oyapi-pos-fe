import { toast } from 'sonner';
import type { ApiErrorBody } from '../types/api';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '' : 'http://localhost:3001');
const TOKEN_KEY = 'pos-token';
const USER_KEY = 'pos-user';

let csrfToken: string | null = null;

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Token helpers (legacy compatibility, now mostly unused)
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  clearToken();
  window.localStorage.removeItem(USER_KEY);
  csrfToken = null;
}

// ---------------------------------------------------------------------------
// CSRF helpers
// ---------------------------------------------------------------------------

async function fetchCsrfToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;

    const body = (await res.json()) as { csrfToken?: string };
    if (body.csrfToken) {
      csrfToken = body.csrfToken;
      return csrfToken;
    }
  } catch {
    // Ignore fetch/parse errors; caller will continue without CSRF header.
  }

  return null;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

type RequestOptions = {
  /** Legacy flag kept for compatibility; session auth does not use bearer tokens. */
  skipAuth?: boolean;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const isMutation = method.toUpperCase() !== 'GET';

  if (isMutation) {
    const currentCsrfToken = csrfToken ?? (await fetchCsrfToken());
    if (currentCsrfToken) {
      headers['x-csrf-token'] = currentCsrfToken;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (res.status === 401 && !options.skipAuth) {
    clearSession();
    if (
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    let errorBody: ApiErrorBody | undefined;
    try {
      errorBody = (await res.json()) as ApiErrorBody;
    } catch {
      // ignore parse errors
    }
    const message = errorBody?.message
      ? Array.isArray(errorBody.message)
        ? errorBody.message.join(', ')
        : errorBody.message
      : `HTTP ${res.status}`;

    // Show a generic toast for all 4xx/5xx — never expose server details in UI
    toast.error('Something went wrong', {
      description: 'Please try again or contact support if the problem persists.',
      id: `api-error-${res.status}`, // deduplicate identical toasts
    });

    throw new ApiError(res.status, message, errorBody);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API methods
// ---------------------------------------------------------------------------

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
};
