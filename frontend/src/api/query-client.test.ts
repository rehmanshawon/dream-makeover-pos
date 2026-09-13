import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createQueryClient } from './query-client';
import { authStore } from '../app/auth/auth-store';

const USER = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN' as const,
};

describe('createQueryClient', () => {
  beforeEach(() => {
    authStore.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    authStore.clear();
    window.localStorage.clear();
  });

  it('clears the query cache when the session is cleared', () => {
    const client = createQueryClient();

    authStore.setSession(USER, 'token-abc');

    client.setQueryData(['customers'], [{ id: '1' }]);
    expect(client.getQueryData(['customers'])).toEqual([{ id: '1' }]);

    authStore.clear();

    expect(client.getQueryData(['customers'])).toBeUndefined();
  });

  it('does not clear the query cache on login', () => {
    const client = createQueryClient();

    client.setQueryData(['public-data'], { ok: true });

    authStore.setSession(USER, 'token-abc');

    expect(client.getQueryData(['public-data'])).toEqual({ ok: true });
  });
});
