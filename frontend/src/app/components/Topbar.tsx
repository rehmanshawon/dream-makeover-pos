import type { JSX, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { Icon } from './Icon';
import './Topbar.css';

interface TopbarProps {
  title: string;
  actions?: ReactNode;
}

/**
 * Persistent header above the page content.
 *
 * Displays the current page title on the left and optional actions on
 * the right. Page-specific actions are supplied by the route.
 */
export function Topbar({ title, actions }: TopbarProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
  const canGoBack =
    historyIndex === undefined || historyIndex > 0 || location.pathname !== '/';

  function goBack(): void {
    if (typeof historyIndex === 'number' && historyIndex <= 0) {
      if (location.pathname !== '/') navigate('/', { replace: true });
      return;
    }
    navigate(-1);
  }

  return (
    <header className="topbar">
      <div className="topbar__heading">
        <Button
          variant="ghost"
          size="sm"
          className="button--icon topbar__back"
          aria-label="Go back"
          title="Go back"
          disabled={!canGoBack}
          onClick={goBack}
        >
          <Icon name="arrow-left" size={20} />
        </Button>
        <h1 className="topbar__title">{title}</h1>
      </div>
      <div className="topbar__actions">{actions}</div>
    </header>
  );
}
