import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('associates label with the input', () => {
    render(<Input label="Customer Name" />);
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
  });

  it('accepts typed input', async () => {
    render(<Input label="Search" />);
    const input = screen.getByLabelText(/search/i);
    await userEvent.type(input, 'Rehman');
    expect(input).toHaveValue('Rehman');
  });

  it('shows hint text when provided', () => {
    render(<Input label="Phone" hint="Include country code" />);
    expect(screen.getByText(/include country code/i)).toBeInTheDocument();
  });

  it('marks the input invalid when error is set', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it('does not show hint when error is present', () => {
    render(<Input label="Email" hint="We never share it" error="Invalid email" />);
    expect(screen.queryByText(/we never share it/i)).not.toBeInTheDocument();
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it('respects the disabled attribute', () => {
    render(<Input label="Locked" disabled />);
    expect(screen.getByLabelText(/locked/i)).toBeDisabled();
  });
});
