import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within as rtlWithin } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { ServicesPage } from './ServicesPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const STAFF: AuthenticatedUser = {
  id: '2',
  username: 'staff',
  displayName: 'Staff',
  role: 'STAFF',
};

const SERVICES = [
  {
    id: 's1',
    name: 'Bridal Facial',
    priceMinor: 350000,
    durationMinutes: 60,
    rewardPointWeight: 1,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 's2',
    name: 'Hair Spa',
    priceMinor: 200000,
    durationMinutes: 45,
    rewardPointWeight: 1,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('ServicesPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockServices(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(SERVICES), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderPage(user: AuthenticatedUser): void {
    renderWithProviders(
      <Routes>
        <Route path="/parlour" element={<ServicesPage />} />
      </Routes>,
      { route: '/parlour', user, token: 'test-token' },
    );
  }

  it('shows all services', async () => {
    mockServices();
    renderPage(ADMIN);

    expect(await screen.findByText('Bridal Facial')).toBeInTheDocument();
    expect(screen.getByText('Hair Spa')).toBeInTheDocument();
  });

  it('shows the price formatted with Taka symbol', async () => {
    mockServices();
    renderPage(ADMIN);

    expect(await screen.findByText('৳3,500.00')).toBeInTheDocument();
    expect(screen.getByText('৳2,000.00')).toBeInTheDocument();
  });

  it('shows the create button to admins', async () => {
    mockServices();
    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');
    expect(screen.getByRole('button', { name: /new service/i })).toBeInTheDocument();
  });

  it('hides the create button from staff', async () => {
    mockServices();
    renderPage(STAFF);

    await screen.findByText('Bridal Facial');
    expect(screen.queryByRole('button', { name: /new service/i })).not.toBeInTheDocument();
  });

  it('filters by search term', async () => {
    mockServices();
    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');

    const search = screen.getByPlaceholderText(/search by name/i);
    await userEvent.type(search, 'hair');

    expect(screen.queryByText('Bridal Facial')).not.toBeInTheDocument();
    expect(screen.getByText('Hair Spa')).toBeInTheDocument();
  });

  it('opens the create modal', async () => {
    mockServices();
    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');
    await userEvent.click(screen.getByRole('button', { name: /new service/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no services', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderPage(ADMIN);

    expect(await screen.findByText(/no services yet/i)).toBeInTheDocument();
  });

  it('shows the Edit and Deactivate buttons to admins', async () => {
    mockServices();
    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');
    expect(screen.getAllByRole('button', { name: /^edit$/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /^deactivate$/i })).toHaveLength(2);
  });

  it('does not show action buttons to staff', async () => {
    mockServices();
    renderPage(STAFF);

    await screen.findByText('Bridal Facial');
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^deactivate$/i })).not.toBeInTheDocument();
  });

  it('opens the edit modal with prefilled values', async () => {
    mockServices();
    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');
    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editButtons[0]!);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /edit service/i })).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Bridal Facial')).toBeInTheDocument();
  });

  it('submits a PATCH and updates the row when saving an edit', async () => {
    const originalFetch = globalThis.fetch;
    let services = [...SERVICES];
    let patchCalled = false;

    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = init?.method ?? 'GET';

      if (method === 'PATCH' && url.includes('/services/s1')) {
        patchCalled = true;
        const body = JSON.parse(init?.body as string);
        const updatedService = {
          ...services.find((service) => service.id === 's1')!,
          ...body,
          name: 'Bridal Facial Deluxe',
        };
        services = services.map((service) =>
          service.id === updatedService.id ? updatedService : service,
        );
        return new Response(JSON.stringify(updatedService), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/services')) {
        return new Response(JSON.stringify(services), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return originalFetch(input, init);
    }) as unknown as typeof fetch;

    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');
    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editButtons[0]!);

    const nameInput = screen.getByLabelText(/^name$/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Bridal Facial Deluxe');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(patchCalled).toBe(true);

    // Verify that the row has been updated
    await screen.findByText('Bridal Facial Deluxe');
  });
});
function within(dialog: HTMLElement) {
  return rtlWithin(dialog);
}
