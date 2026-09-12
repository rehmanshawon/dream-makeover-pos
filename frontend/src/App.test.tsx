import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { authStore } from './app/auth/auth-store';
import type { AuthenticatedUser } from './types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('App', () => {
  beforeEach(() => {
    authStore.setSession(ADMIN, 'test-token');
  });

  afterEach(() => {
    authStore.clear();
  });
  it('renders the sidebar', () => {
    render(<App />);
    expect(screen.getByRole('complementary', { name: /primary navigation/i })).toBeInTheDocument();
  });

  it('renders the topbar with the dashboard title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /^dashboard$/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the dashboard placeholder', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /^dashboard$/i, level: 2 })).toBeInTheDocument();
  });
});
