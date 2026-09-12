import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test/render-with-providers';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders the login form', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('disables submit until both fields have content', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    );

    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    expect(button).toBeEnabled();
  });

  it('shows the server error on failed login', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            statusCode: 401,
            message: 'Invalid username or password',
          }),
          {
            status: 401,
            headers: { 'content-type': 'application/json' },
          },
        ),
    ) as unknown as typeof fetch;

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    );

    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid username or password/i);
    });
  });
});
