import type { JSX, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Requires an authenticated user.
 *
 * Unauthenticated visitors are redirected to /login. The current path
 * is passed as `state.from` so that the login page can return them
 * here after successful sign-in.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
