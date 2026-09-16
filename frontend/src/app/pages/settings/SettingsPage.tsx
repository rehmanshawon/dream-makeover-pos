import { useState, type JSX } from 'react';
import { UsersSection } from './UsersSection';
import { CategoriesSection } from './CategoriesSection';
import { SecuritySection } from './SecuritySection';
import { BusinessInfoSection } from './BusinessInfoSection';
import './SettingsPage.css';

type SettingsTab = 'users' | 'categories' | 'security' | 'business';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'users', label: 'Users' },
  { key: 'categories', label: 'Categories' },
  { key: 'security', label: 'Security' },
  { key: 'business', label: 'Business info' },
];

export function SettingsPage(): JSX.Element {
  const [tab, setTab] = useState<SettingsTab>('users');

  return (
    <div className="settings-page">
      <nav className="settings-page__tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`settings-page__tab${tab === t.key ? ' settings-page__tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="settings-page__content">
        {tab === 'users' && <UsersSection />}
        {tab === 'categories' && <CategoriesSection />}
        {tab === 'security' && <SecuritySection />}
        {tab === 'business' && <BusinessInfoSection />}
      </div>
    </div>
  );
}
