import type { JSX } from 'react';
import './PlaceholderPage.css';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

/**
 * A neutral placeholder for pages that are not yet implemented.
 *
 * Every route in the app renders this until its real page is built in a
 * later sprint. This makes the navigation and layout fully testable
 * without pretending features exist.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps): JSX.Element {
  return (
    <div className="placeholder-page">
      <div className="placeholder-page__card">
        <h2 className="placeholder-page__heading">{title}</h2>
        <p className="placeholder-page__description">{description}</p>
        <p className="placeholder-page__note">This screen is scheduled for an upcoming sprint.</p>
      </div>
    </div>
  );
}
