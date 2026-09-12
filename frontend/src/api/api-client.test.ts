import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api-client';
import { ApiError } from './api-error';
import { setTokenProvider, resetTokenProvider } from './token-provider';

describe('api client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetTokenProvider();
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetch(
    resolver: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  ): void {
    globalThis.fetch = vi.fn(resolver) as unknown as typeof fetch;
  }

  it('attaches Authorization header when a token is available', async () => {
    setTokenProvider(() => 'test-token');

    let capturedInit: RequestInit | undefined;
    mockFetch(async (_input, init) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    await api.get<{ ok: boolean }>('/example');

    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('does not attach Authorization header when skipAuth is set', async () => {
    setTokenProvider(() => 'test-token');

    let capturedInit: RequestInit | undefined;
    mockFetch(async (_input, init) => {
      capturedInit = init;
      return new Response(null, { status: 204 });
    });

    await api.post('/auth/login', { username: 'a', password: 'b' }, { skipAuth: true });

    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('serializes JSON bodies with correct Content-Type', async () => {
    let capturedInit: RequestInit | undefined;
    mockFetch(async (_input, init) => {
      capturedInit = init;
      return new Response(JSON.stringify({ id: '1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    await api.post<{ id: string }>('/items', { name: 'Test' });

    expect(capturedInit?.body).toBe(JSON.stringify({ name: 'Test' }));
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws ApiError with parsed message on 4xx', async () => {
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            statusCode: 409,
            message: 'Already exists',
            error: 'Conflict',
          }),
          {
            status: 409,
            headers: { 'content-type': 'application/json' },
          },
        ),
    );

    try {
      await api.post('/items', { name: 'Test' });
      throw new Error('Expected an error to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(409);
      expect(apiErr.message).toBe('Already exists');
    }
  });

  it('joins validation message arrays', async () => {
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            statusCode: 400,
            message: ['name must be a string', 'name is required'],
            error: 'Bad Request',
          }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          },
        ),
    );

    try {
      await api.post('/items', {});
      throw new Error('Expected an error to be thrown');
    } catch (err) {
      expect((err as ApiError).message).toBe('name must be a string, name is required');
    }
  });

  it('normalizes network failure into ApiError with status 0', async () => {
    mockFetch(async () => {
      throw new TypeError('Network error');
    });

    try {
      await api.get('/anything');
      throw new Error('Expected an error to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(0);
      expect(apiErr.isNetworkError).toBe(true);
    }
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch(async () => new Response(null, { status: 204 }));

    const result = await api.delete<undefined>('/items/1');
    expect(result).toBeUndefined();
  });
});
