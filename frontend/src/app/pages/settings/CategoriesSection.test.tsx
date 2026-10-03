import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render-with-providers';
import { CategoriesSection } from './CategoriesSection';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const TREE = [
  {
    id: 'c1',
    name: 'Cosmetics',
    slug: 'cosmetics',
    kind: 'PRODUCT',
    parentId: null,
    displayOrder: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    children: [
      {
        id: 'c1a',
        name: 'Lipstick',
        slug: 'lipstick',
        kind: 'PRODUCT',
        parentId: 'c1',
        displayOrder: 0,
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        children: [],
      },
    ],
  },
  {
    id: 'c2',
    name: 'Services',
    slug: 'services',
    kind: 'SERVICE',
    parentId: null,
    displayOrder: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    children: [],
  },
];

describe('CategoriesSection', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockTree(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(TREE), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderSection(): void {
    renderWithProviders(<CategoriesSection />, {
      user: ADMIN,
      token: 'test-token',
    });
  }

  it('renders the tree with nesting', async () => {
    mockTree();
    renderSection();

    expect(await screen.findByText('Cosmetics')).toBeInTheDocument();
    expect(screen.getByText('Lipstick')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
  });

  it('renders kind badges', async () => {
    mockTree();
    renderSection();

    await screen.findByText('Cosmetics');
    expect(screen.getAllByText('Product').length).toBeGreaterThan(0);
    expect(screen.getByText('Service')).toBeInTheDocument();
  });

  it('opens the create modal', async () => {
    mockTree();
    renderSection();

    await screen.findByText('Cosmetics');
    await userEvent.click(screen.getByRole('button', { name: /new category/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
  });

  it('opens the edit modal', async () => {
    mockTree();
    renderSection();

    await screen.findByText('Cosmetics');
    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editButtons[0]!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cosmetics')).toBeInTheDocument();
  });

  it('uploads a menu icon when creating a top-level category', async () => {
    let createBody: BodyInit | null | undefined;
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        createBody = init.body;
        return new Response(
          JSON.stringify({
            id: 'c3',
            name: 'Bridal',
            slug: 'bridal',
            kind: 'PRODUCT',
            parentId: null,
            iconUrl: '/uploads/category-icons/bridal.png',
            displayOrder: 0,
            active: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify(TREE), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Cosmetics');
    await user.click(screen.getByRole('button', { name: /new category/i }));
    await user.type(screen.getByLabelText(/^name$/i), 'Bridal');
    const iconFile = new File(['icon-data'], 'bridal.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Menu icon'), iconFile);
    await user.click(screen.getByRole('button', { name: /create category/i }));

    await waitFor(() => expect(createBody).toBeInstanceOf(FormData));
    expect((createBody as FormData).get('icon')).toBe(iconFile);
    expect((createBody as FormData).get('name')).toBe('Bridal');
    expect((createBody as FormData).has('parentId')).toBe(false);
  });

  it('hides the icon picker for a child category', async () => {
    mockTree();
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Cosmetics');
    await user.click(screen.getByRole('button', { name: /new category/i }));
    await user.selectOptions(screen.getByLabelText('Parent category'), 'c1');

    expect(screen.queryByLabelText('Menu icon')).not.toBeInTheDocument();
  });
});
