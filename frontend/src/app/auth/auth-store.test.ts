import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from './auth-store';

const USER = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN' as const,
};

describe('authStore', () => {
  beforeEach(() => {
    authStore.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    authStore.clear();
    window.localStorage.clear();
  });

  it('starts with no session', () => {
    const state = authStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('stores a session', () => {
    authStore.setSession(USER, 'token-abc');
    const state = authStore.getState();
    expect(state.user).toEqual(USER);
    expect(state.token).toBe('token-abc');
  });

  it('persists the session to localStorage', () => {
    authStore.setSession(USER, 'token-abc');
    const raw = window.localStorage.getItem('dream-makeover.auth');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.user).toEqual(USER);
    expect(parsed.token).toBe('token-abc');
  });

  it('clears the session and storage', () => {
    authStore.setSession(USER, 'token-abc');
    authStore.clear();
    expect(authStore.getState().user).toBeNull();
    expect(window.localStorage.getItem('dream-makeover.auth')).toBeNull();
  });

  it('notifies subscribers on change', () => {
    const listener = vi.fn();
    const unsubscribe = authStore.subscribe(listener);

    authStore.setSession(USER, 'token-abc');
    expect(listener).toHaveBeenCalledTimes(1);

    authStore.clear();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    authStore.setSession(USER, 'token-abc');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
