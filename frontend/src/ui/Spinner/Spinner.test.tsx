import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('has an accessible role and label', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<Spinner label="Fetching data" />);
    expect(screen.getByRole('status', { name: /fetching data/i })).toBeInTheDocument();
  });
});
