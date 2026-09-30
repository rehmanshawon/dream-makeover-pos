import { getToken } from './token-provider';

function getBaseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) throw new Error('VITE_API_BASE_URL is not defined. Set it in frontend/.env.');
  return url.replace(/\/+$/, '');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    return Array.isArray(body.message)
      ? body.message.join(', ')
      : (body.message ?? `Request failed with status ${response.status}`);
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export const databaseBackupsApi = {
  async download(): Promise<{ blob: Blob; filename: string }> {
    const response = await fetch(`${getBaseUrl()}/database-backups`, {
      headers: { ...authHeaders(), Accept: 'application/zip' },
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));

    const disposition = response.headers.get('content-disposition') ?? '';
    const filename =
      disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? 'dream-makeover-backup.zip';
    return { blob: await response.blob(), filename };
  },

  async restore(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('backup', file);
    formData.append('confirmReplace', 'true');

    const response = await fetch(`${getBaseUrl()}/database-backups/restore`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));
  },
};
