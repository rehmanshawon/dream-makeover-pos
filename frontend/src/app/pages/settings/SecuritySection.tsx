import { useState, type JSX } from 'react';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { useAuth } from '../../auth/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import './SecuritySection.css';

export function SecuritySection(): JSX.Element {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSuccess = (): void => {
    setSuccess(true);
    // Auto-hide the banner after a few seconds
    window.setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <Card title="Security" subtitle="Your account password">
      {!user ? (
        <p className="security-section__empty">You are not signed in.</p>
      ) : (
        <div className="security-section">
          <div className="security-section__row">
            <div className="security-section__label">
              <span className="security-section__label-title">Password</span>
              <span className="security-section__label-subtitle">
                Use a password of at least 8 characters. Do not share it.
              </span>
            </div>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Change password
            </Button>
          </div>

          {success && (
            <div className="security-section__success" role="status">
              Your password has been updated. Keep it safe.
            </div>
          )}
        </div>
      )}

      <ChangePasswordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </Card>
  );
}
