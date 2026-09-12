import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSX, useState } from 'react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders content when open', () => {
    render(
      <Modal open title="Test" onClose={() => undefined}>
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/modal body/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} title="Test" onClose={() => undefined}>
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Test" onClose={onClose}>
        <p>Modal body</p>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on overlay click', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Test" onClose={onClose}>
        <p>Modal body</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on close button click', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Test" onClose={onClose}>
        <p>Modal body</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close on overlay click when disabled', async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Test" onClose={onClose} closeOnOverlayClick={false}>
        <p>Modal body</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('can be toggled with state', async () => {
    function Wrapper(): JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} title="Toggle" onClose={() => setOpen(false)}>
            <p>Content</p>
          </Modal>
        </>
      );
    }
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('button', { name: /open/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
