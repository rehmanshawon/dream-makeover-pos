import type { JSX, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface AdminRouteProps {
  children: ReactNode;
  /**
   * Where to send authenticated non-admin users. Defaults to /pos.
   */
  fallback?: string;
}

/**
 * Requires an ADMIN user. Assumes an authenticated user; pair with
 * ProtectedRoute for the outer shell.
 *
 * Non-admin authenticated users are silently redirected to a safe page
 * rather than shown a forbidden screen. The sidebar already hides admin
 * links, so this guard is a defense against manual URL entry.
 */
export function AdminRoute({ children, fallback = '/pos' }: AdminRouteProps): JSX.Element {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
