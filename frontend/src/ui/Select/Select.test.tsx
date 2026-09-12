import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const OPTIONS = [
  { value: 'cosmetics', label: 'Cosmetics' },
  { value: 'saree', label: 'Saree' },
  { value: 'three-piece', label: 'Three-piece' },
];

describe('Select', () => {
  it('renders all options', () => {
    render(<Select label="Category" options={OPTIONS} />);
    const select = screen.getByLabelText(/category/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /cosmetics/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /saree/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /three-piece/i })).toBeInTheDocument();
  });

  it('calls onChange with the selected value', async () => {
    const onChange = vi.fn();
    render(<Select label="Category" options={OPTIONS} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'saree');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText(/category/i)).toHaveValue('saree');
  });

  it('shows error and marks invalid', () => {
    render(<Select label="Category" options={OPTIONS} error="Required" />);
    expect(screen.getByLabelText(/category/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
});
