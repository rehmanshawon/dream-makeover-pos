import { JSX } from 'react/jsx-runtime';
import './App.css';

/**
 * Root application component.
 *
 * At this stage it only renders a placeholder to confirm the frontend
 * build, styling, and test setup are working. Business features are
 * added in later sprints.
 */
export function App(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-mark">DM</span>
          <div className="app-brand-text">
            <span className="app-brand-name">Dream Makeover</span>
            <span className="app-brand-tagline">A Luxury Beauty Salon</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="placeholder-card">
          <h1>Frontend foundation ready</h1>
          <p>The React application is running. Business screens are added in upcoming sprints.</p>
        </section>
      </main>
    </div>
  );
}
