import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole('button', { name: /nope/i })).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: /nope/i }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('defaults to type="button" to prevent form submission', () => {
    render(<Button>Safe</Button>);
    expect(screen.getByRole('button', { name: /safe/i })).toHaveAttribute('type', 'button');
  });

  it('applies the requested variant class', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button', { name: /delete/i })).toHaveClass('button--danger');
  });
});
