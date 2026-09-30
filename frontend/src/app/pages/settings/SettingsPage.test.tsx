import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { SettingsPage } from './SettingsPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('SettingsPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockEndpoints(): void {
    globalThis.fetch = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/users')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/loyalty-settings')) {
        return new Response(JSON.stringify(defaultLoyaltySettings()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as unknown as typeof fetch;
  }

  function defaultLoyaltySettings() {
    return {
      id: 1,
      earningSpendMinor: 10000,
      earningPoints: 1,
      tiers: [
        { tier: 'Silver', minimumPoints: 0, redeemPoints: 0, discountMinor: 0 },
        { tier: 'Gold', minimumPoints: 200, redeemPoints: 0, discountMinor: 0 },
        { tier: 'Platinum', minimumPoints: 500, redeemPoints: 0, discountMinor: 0 },
        { tier: 'Diamond', minimumPoints: 1000, redeemPoints: 0, discountMinor: 0 },
      ],
      updatedAt: '2026-09-30T00:00:00.000Z',
    };
  }

  function renderPage(): void {
    renderWithProviders(
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>,
      { route: '/settings', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the settings tabs including Loyalty', async () => {
    mockEndpoints();
    renderPage();

    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /business info/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /loyalty/i })).toBeInTheDocument();
  });

  it('shows the Users tab by default', async () => {
    mockEndpoints();
    renderPage();

    expect(screen.getByRole('tab', { name: /users/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to the Security tab', async () => {
    mockEndpoints();
    renderPage();

    await userEvent.click(screen.getByRole('tab', { name: /security/i }));

    expect(screen.getByRole('tab', { name: /security/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('switches to the Business info tab', async () => {
    mockEndpoints();
    renderPage();

    await userEvent.click(screen.getByRole('tab', { name: /business info/i }));

    expect(screen.getByText('DREAM MAKEOVER')).toBeInTheDocument();
  });

  it('allows admins to save earning and tier redemption rules', async () => {
    mockEndpoints();
    const originalFetch = globalThis.fetch;
    let updatedSettings: Record<string, unknown> = {};
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/loyalty-settings') && init?.method === 'PATCH') {
        updatedSettings = JSON.parse(init.body as string);
        return new Response(JSON.stringify({ ...defaultLoyaltySettings(), ...updatedSettings }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as unknown as typeof fetch;
    renderPage();

    await userEvent.click(screen.getByRole('tab', { name: /loyalty/i }));
    await screen.findByLabelText('Gold points to redeem');
    await userEvent.clear(screen.getByLabelText(/Spend required for points/i));
    await userEvent.type(screen.getByLabelText(/Spend required for points/i), '200');
    await userEvent.clear(screen.getByLabelText('Gold points to redeem'));
    await userEvent.type(screen.getByLabelText('Gold points to redeem'), '100');
    await userEvent.clear(screen.getByLabelText('Gold discount'));
    await userEvent.type(screen.getByLabelText('Gold discount'), '50');
    await userEvent.click(screen.getByRole('button', { name: /save loyalty settings/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Loyalty settings saved.');
    expect(updatedSettings).toMatchObject({
      earningSpendMinor: 20000,
      tiers: expect.arrayContaining([
        expect.objectContaining({ tier: 'Gold', redeemPoints: 100, discountMinor: 5000 }),
      ]),
    });
  });
});
