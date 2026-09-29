import type { JSX, MouseEvent } from 'react';
import { Button } from '../../ui/Button';
import { Icon } from './Icon';
import { BUSINESS_INFO } from '../../config/business';
import './PrintReportAction.css';

interface PrintReportActionProps {
  title: string;
  subtitle: string;
}

export function PrintReportAction({ title, subtitle }: PrintReportActionProps): JSX.Element {
  const generatedAt = new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const handlePrint = (event: MouseEvent<HTMLButtonElement>): void => {
    const report = event.currentTarget.closest<HTMLElement>('[data-printable-report]');
    if (!report) return;
    document.body.setAttribute('data-print-mode', 'true');
    report.setAttribute('data-printing', 'true');
    const cleanup = (): void => {
      document.body.removeAttribute('data-print-mode');
      report.removeAttribute('data-printing');
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  };

  return (
    <>
      <div className="print-report-action">
        <Button variant="secondary" onClick={handlePrint}>
          <Icon name="print" size={16} />
          Print / Save PDF
        </Button>
      </div>
      <header className="print-report-header">
        <strong>{BUSINESS_INFO.name}</strong>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <small>Generated {generatedAt}</small>
      </header>
    </>
  );
}
