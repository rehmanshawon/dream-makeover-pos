import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrintReportAction } from './PrintReportAction';

describe('PrintReportAction', () => {
  afterEach(() => {
    document.body.removeAttribute('data-print-mode');
    vi.restoreAllMocks();
  });

  it('prints only the nearest report section and restores the page after printing', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <section data-printable-report>
        <PrintReportAction title="Sales report" subtitle="2026-09-01 to 2026-09-30" />
        <p>Report rows</p>
      </section>,
    );

    fireEvent.click(screen.getByRole('button', { name: /print \/ save pdf/i }));

    const report = document.querySelector('[data-printable-report]');
    expect(print).toHaveBeenCalledOnce();
    expect(document.body).toHaveAttribute('data-print-mode', 'true');
    expect(report).toHaveAttribute('data-printing', 'true');

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body).not.toHaveAttribute('data-print-mode');
    expect(report).not.toHaveAttribute('data-printing');
  });
});
