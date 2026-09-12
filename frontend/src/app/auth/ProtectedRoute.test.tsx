import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test/render-with-providers';
import { ProtectedRoute } from './ProtectedRoute';
import type { AuthenticatedUser } from '../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

function renderRoute(user: AuthenticatedUser | null, token: string | null): void {
  renderWithProviders(
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div>Protected content</div>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>,
    { user, token },
  );
}

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    renderRoute(ADMIN, 'token-abc');
    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderRoute(null, null);
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
    expect(screen.getByText(/login page/i)).toBeInTheDocument();
  });
});
