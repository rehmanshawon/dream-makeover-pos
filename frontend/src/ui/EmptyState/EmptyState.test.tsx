import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No customers yet" description="Add one to get started" />);
    expect(screen.getByText(/no customers yet/i)).toBeInTheDocument();
    expect(screen.getByText(/add one to get started/i)).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="Empty" action={<button>Add customer</button>} />);
    expect(screen.getByRole('button', { name: /add customer/i })).toBeInTheDocument();
  });
});
