import { ApiError } from './api-error';
import { getToken } from './token-provider';

interface RequestOptions {
  /**
   * When true, no Authorization header is attached even if a token
   * exists. Use this for public endpoints like login.
   */
  skipAuth?: boolean;
  /**
   * Optional AbortSignal for cancellation.
   */
  signal?: AbortSignal;
  /**
   * Additional headers to merge.
   */
  headers?: Record<string, string>;
  formData?: boolean;
}

function baseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new Error('VITE_API_BASE_URL is not defined. Set it in frontend/.env.');
  }
  return url.replace(/\/+$/, '');
}

function buildHeaders(options: RequestOptions, hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  if (hasBody && !options.formData) {
    headers['Content-Type'] = 'application/json';
  }

  if (!options.skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function parseErrorResponse(response: Response, url: string): Promise<ApiError> {
  let message = `Request failed with status ${response.status}`;
  let details: unknown = undefined;

  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as {
        message?: string | string[];
        error?: string;
      };
      details = payload;

      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (typeof payload.message === 'string') {
        message = payload.message;
      }
    } else {
      const text = await response.text();
      if (text) message = text;
    }
  } catch {
    // Fall back to the default message.
  }

  return new ApiError(response.status, message, details, url);
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions,
): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const hasBody = body !== undefined;

  let response: Response;
  try {
    const init: RequestInit = {
      method,
      headers: buildHeaders(options, hasBody),
    };
    if (hasBody) {
      init.body = options.formData ? (body as BodyInit) : JSON.stringify(body);
    }
    if (options.signal) {
      init.signal = options.signal;
    }
    response = await fetch(url, init);
  } catch (err) {
    // fetch throws on network errors, CORS failures, and aborts.
    // We normalize all of these into ApiError with status 0.
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'Request was aborted', undefined, url);
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(0, message, err, url);
  }

  if (!response.ok) {
    throw await parseErrorResponse(response, url);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // Non-JSON success response. Return the raw text.
    return (await response.text()) as unknown as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return request<T>('POST', path, body, options);
  },
  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },
  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return request<T>('PUT', path, body, options);
  },
  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
};
