import type { JSX, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface RedirectIfAuthenticatedProps {
  children: ReactNode;
}

/**
 * Redirects authenticated users away from public pages like /login.
 *
 * Admins land on the dashboard. Staff land on the POS.
 */
export function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps): JSX.Element {
  const { isAuthenticated, isAdmin } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/' : '/pos'} replace />;
  }

  return <>{children}</>;
}
