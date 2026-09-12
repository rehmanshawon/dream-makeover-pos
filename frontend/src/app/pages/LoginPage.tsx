import { useState, type FormEvent, type JSX } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { ApiError } from '../../api/api-error';
import { useAuth } from '../auth/AuthContext';
import './LoginPage.css';

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(username.trim(), password);
      const destination = state?.from?.pathname ?? '/';
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__panel">
        <div className="login-page__brand">
          <span className="login-page__mark">DM</span>
          <div className="login-page__brand-text">
            <h1 className="login-page__brand-name">Dream Makeover</h1>
            <p className="login-page__brand-tagline">A Luxury Beauty Salon</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-page__form" noValidate>
          <Input
            label="Username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={submitting}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />

          {error && (
            <div className="login-page__error" role="alert">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!username || !password || submitting}
          >
            Sign in
          </Button>
        </form>

        <p className="login-page__footer">
          Contact the shop owner if you cannot access your account.
        </p>
      </div>
    </div>
  );
}
