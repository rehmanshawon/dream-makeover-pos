import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('accepts multiline input', async () => {
    render(<Textarea label="Note" />);
    const textarea = screen.getByLabelText(/note/i);
    await userEvent.type(textarea, 'Line 1\nLine 2');
    expect(textarea).toHaveValue('Line 1\nLine 2');
  });

  it('shows error and marks invalid', () => {
    render(<Textarea label="Note" error="Too long" />);
    expect(screen.getByLabelText(/note/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/too long/i)).toBeInTheDocument();
  });
});
