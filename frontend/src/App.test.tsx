import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  function renderApp(): void {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    authStore.setSession(ADMIN, 'test-token');
  });

  afterEach(() => {
    authStore.clear();
  });
  it('renders the sidebar', () => {
    renderApp();
    expect(screen.getByRole('complementary', { name: /primary navigation/i })).toBeInTheDocument();
  });

  it('renders the topbar with the dashboard title', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /^dashboard$/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the dashboard placeholder', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /^today$/i, level: 3 })).toBeInTheDocument();
  });

  it('renders the trend chart and top items sections', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /^revenue trend$/i, level: 3 })).toBeInTheDocument();
  });
});
