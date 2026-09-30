import { useRef, useState, type JSX } from 'react';
import { databaseBackupsApi } from '../../../api/database-backups';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import './DatabaseBackupsSection.css';

export function DatabaseBackupsSection(): JSX.Element {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const downloadBackup = async (): Promise<void> => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { blob, filename } = await databaseBackupsApi.download();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage('Backup downloaded. Store it somewhere secure.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the backup.');
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async (): Promise<void> => {
    if (!selectedFile) return;
    const confirmed = window.confirm(
      'Restore this backup and replace all current database records and employee photos? This cannot be undone.',
    );
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await databaseBackupsApi.restore(selectedFile);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setMessage('Backup restored. Reload the app to show the restored data.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not restore the backup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Data backup" subtitle="Save or restore this computer's POS data">
      <div className="database-backups-section">
        <p className="database-backups-section__note">
          A full backup includes the MySQL database and employee photos. Keep backup files private;
          they contain business and customer information.
        </p>

        <div className="database-backups-section__actions">
          <Button variant="secondary" loading={busy} onClick={() => void downloadBackup()}>
            Download full backup
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
            Choose backup file
          </Button>
          <input
            ref={fileInput}
            className="database-backups-section__file-input"
            type="file"
            accept=".zip,application/zip"
            aria-label="Select backup file"
            disabled={busy}
            onChange={(event) => {
              setSelectedFile(event.currentTarget.files?.[0] ?? null);
              setError('');
              setMessage('');
            }}
          />
          <Button
            variant="danger"
            disabled={!selectedFile || busy}
            loading={busy && Boolean(selectedFile)}
            onClick={() => void restoreBackup()}
          >
            Restore and replace data
          </Button>
        </div>

        {selectedFile && (
          <p className="database-backups-section__file" role="status">
            Selected: {selectedFile.name}
          </p>
        )}
        {error && (
          <p className="database-backups-section__error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="database-backups-section__success" role="status">
            {message}
          </p>
        )}
      </div>
    </Card>
  );
}
