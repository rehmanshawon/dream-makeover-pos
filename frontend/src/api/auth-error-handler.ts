import { ApiError } from './api-error';
import { authStore } from '../app/auth/auth-store';

const LOGIN_PATH = '/auth/login';

/**
 * Handles a 401 response from any authenticated endpoint by clearing
 * the current session.
 *
 * Skips 401s that came from the login endpoint, since those indicate
 * invalid credentials rather than an expired session.
 *
 * This handler does not perform redirects. Once the session is cleared,
 * the route guards will render the login page automatically.
 */
export function handleUnauthorized(error: unknown): void {
  if (!(error instanceof ApiError)) return;
  if (error.status !== 401) return;

  // Login failures are not session expiries.
  if (error.url && error.url.endsWith(LOGIN_PATH)) return;

  // Already logged out; nothing to do.
  if (!authStore.getState().token) return;

  authStore.clear();
}
