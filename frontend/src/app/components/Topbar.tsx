import type { JSX, ReactNode } from 'react';
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
  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__actions">{actions}</div>
    </header>
  );
}
