import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders title and subtitle when provided', () => {
    render(
      <Card title="Monthly Report" subtitle="January 2026">
        Body
      </Card>,
    );
    expect(screen.getByRole('heading', { name: /monthly report/i })).toBeInTheDocument();
    expect(screen.getByText(/january 2026/i)).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <Card title="X" actions={<button>Refresh</button>}>
        Body
      </Card>,
    );
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<Card footer={<span>Total: 100</span>}>Body</Card>);
    expect(screen.getByText(/total: 100/i)).toBeInTheDocument();
  });

  it('does not render header when no title, subtitle, or actions', () => {
    const { container } = render(<Card>Body</Card>);
    expect(container.querySelector('.card__header')).toBeNull();
  });
});
