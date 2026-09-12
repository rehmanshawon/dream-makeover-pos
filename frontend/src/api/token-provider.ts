/**
 * A source of the current authentication token.
 *
 * The API client consults this provider on every request. The provider
 * returns null when the user is not authenticated, in which case no
 * Authorization header is attached.
 *
 * Sprint 11 will register a provider backed by the auth store.
 */
export type TokenProvider = () => string | null;

let currentProvider: TokenProvider = () => null;

export function setTokenProvider(provider: TokenProvider): void {
  currentProvider = provider;
}

export function getToken(): string | null {
  return currentProvider();
}

/**
 * Test helper. Resets the provider to the default null-returning state.
 * Not intended for production use.
 */
export function resetTokenProvider(): void {
  currentProvider = () => null;
}
