import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { handleUnauthorized } from './auth-error-handler';
import { authStore } from '../app/auth/auth-store';

const USER = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN' as const,
};

describe('handleUnauthorized', () => {
  beforeEach(() => {
    authStore.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    authStore.clear();
    window.localStorage.clear();
  });

  it('clears the session on a 401 from an authenticated endpoint', () => {
    authStore.setSession(USER, 'token-abc');

    handleUnauthorized(new ApiError(401, 'Unauthorized', undefined, 'http://test.local/customers'));

    expect(authStore.getState().token).toBeNull();
    expect(authStore.getState().user).toBeNull();
  });

  it('does not clear the session on a 401 from /auth/login', () => {
    authStore.setSession(USER, 'token-abc');

    handleUnauthorized(
      new ApiError(401, 'Invalid credentials', undefined, 'http://test.local/auth/login'),
    );

    expect(authStore.getState().token).toBe('token-abc');
  });

  it('does nothing when the session is already cleared', () => {
    handleUnauthorized(new ApiError(401, 'Unauthorized', undefined, 'http://test.local/customers'));
    expect(authStore.getState().token).toBeNull();
  });

  it('ignores non-401 errors', () => {
    authStore.setSession(USER, 'token-abc');

    handleUnauthorized(
      new ApiError(500, 'Internal error', undefined, 'http://test.local/customers'),
    );

    expect(authStore.getState().token).toBe('token-abc');
  });

  it('ignores non-ApiError values', () => {
    authStore.setSession(USER, 'token-abc');

    handleUnauthorized(new Error('Something else'));

    expect(authStore.getState().token).toBe('token-abc');
  });

  it('ignores network errors (status 0)', () => {
    authStore.setSession(USER, 'token-abc');

    handleUnauthorized(new ApiError(0, 'Network error', undefined, 'http://test.local/customers'));

    expect(authStore.getState().token).toBe('token-abc');
  });
});
