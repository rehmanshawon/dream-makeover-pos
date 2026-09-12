import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('applies variant class', () => {
    render(<Badge variant="success">Paid</Badge>);
    expect(screen.getByText(/paid/i)).toHaveClass('badge--success');
  });
});
