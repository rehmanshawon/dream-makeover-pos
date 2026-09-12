/**
 * Normalized error returned by the API client.
 *
 * All failures — network, HTTP, or parsing — are converted into this
 * class so that callers have a single shape to handle.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /**
   * True when the failure is a network-level issue (no response from the
   * server). In this case, `status` is 0.
   */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * True when the failure is due to missing or invalid authentication.
   */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * True when the authenticated user is not allowed to perform the action.
   */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}
