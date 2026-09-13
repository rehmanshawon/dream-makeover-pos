/**
 * Normalized error returned by the API client.
 *
 * All failures — network, HTTP, or parsing — are converted into this
 * class so that callers have a single shape to handle.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly details: unknown;
  public readonly url: string | null;

  constructor(status: number, message: string, details?: unknown, url?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.url = url ?? null;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}
