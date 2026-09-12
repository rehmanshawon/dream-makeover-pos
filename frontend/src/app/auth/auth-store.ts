import type { AuthenticatedUser } from '../../types/auth';
import { setTokenProvider } from '../../api/token-provider';

const STORAGE_KEY = 'dream-makeover.auth';

export interface AuthState {
  user: AuthenticatedUser | null;
  token: string | null;
}

const EMPTY_STATE: AuthState = {
  user: null,
  token: null,
};

type Listener = () => void;

/**
 * A small external store for authentication state.
 *
 * React components subscribe via `useAuth`. Non-React code (the API
 * client, error handlers) reads the current state via `getState`.
 *
 * State is persisted to localStorage so that the session survives an
 * application restart. The backend JWT expires independently of this
 * store, so a stale token will be rejected by the server and cleared
 * via a 401 handler.
 */
class AuthStore {
  private state: AuthState = EMPTY_STATE;
  private listeners = new Set<Listener>();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as AuthState;
      if (parsed?.user && parsed?.token) {
        this.state = { user: parsed.user, token: parsed.token };
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Corrupt storage. Treat as unauthenticated and remove the entry.
      window.localStorage.removeItem(STORAGE_KEY);
      this.state = EMPTY_STATE;
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    if (this.state.user && this.state.token) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getState(): AuthState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setSession(user: AuthenticatedUser, token: string): void {
    this.state = { user, token };
    this.persist();
    this.notify();
  }

  clear(): void {
    this.state = EMPTY_STATE;
    this.persist();
    this.notify();
  }

  /**
   * Ensures the token provider is wired exactly once. Called during
   * application bootstrap.
   */
  wireTokenProvider(): void {
    if (this.initialized) return;
    setTokenProvider(() => this.state.token);
    this.initialized = true;
  }
}

export const authStore = new AuthStore();
