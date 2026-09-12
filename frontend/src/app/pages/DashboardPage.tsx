import type { JSX } from 'react';
import { PlaceholderPage } from './PlaceholderPage';

export function DashboardPage(): JSX.Element {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Overview of today's sales, upcoming appointments, and monthly revenue."
    />
  );
}
