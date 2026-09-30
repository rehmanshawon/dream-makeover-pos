import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('shows matching suggestions while typing and applies a clicked suggestion', async () => {
    const onValueChange = vi.fn();
    render(
      <SearchInput
        placeholder="Search customers"
        value="sa"
        suggestions={['Sarah Ahmed', 'Samira Khan', 'John Doe']}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);

    await userEvent.click(screen.getByRole('option', { name: 'Sarah Ahmed' }));
    expect(onValueChange).toHaveBeenCalledWith('Sarah Ahmed');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports selecting a suggestion with the keyboard', () => {
    const onValueChange = vi.fn();
    render(<SearchInput value="ca" suggestions={['Cash', 'Card']} onValueChange={onValueChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith('Cash');
  });

  it('does not show suggestions until there is a query', () => {
    render(<SearchInput value="" suggestions={['Cash']} onValueChange={vi.fn()} />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
