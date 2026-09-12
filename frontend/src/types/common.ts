export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  error?: string;
}
