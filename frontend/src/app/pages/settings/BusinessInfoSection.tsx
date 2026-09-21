import type { JSX } from 'react';
import { Card } from '../../../ui/Card';
import { BUSINESS_INFO } from '../../../config/business';
import './BusinessInfoSection.css';

export function BusinessInfoSection(): JSX.Element {
  return (
    <Card title="Business info" subtitle="Details printed on receipts">
      <dl className="business-info">
        <div className="business-info__row">
          <dt>Name</dt>
          <dd>{BUSINESS_INFO.name}</dd>
        </div>
        <div className="business-info__row">
          <dt>Tagline</dt>
          <dd>{BUSINESS_INFO.tagline}</dd>
        </div>
        <div className="business-info__row">
          <dt>Address</dt>
          <dd>
            {BUSINESS_INFO.addressLines.map((line) => (
              <span key={line} className="business-info__line">
                {line}
              </span>
            ))}
          </dd>
        </div>
        <div className="business-info__row">
          <dt>Phone</dt>
          <dd>{BUSINESS_INFO.phone}</dd>
        </div>
        <div className="business-info__row">
          <dt>Website</dt>
          <dd>{BUSINESS_INFO.website}</dd>
        </div>
        <div className="business-info__row">
          <dt>Email</dt>
          <dd>{BUSINESS_INFO.email}</dd>
        </div>
      </dl>

      <div className="business-info__note">
        <p>
          These values are currently stored in the application configuration file and are shown here
          for reference. To update them, edit <code>frontend/src/config/business.ts</code> and
          rebuild the application.
        </p>
        <p>
          Editable business info requires a settings storage system, which is planned for a future
          release.
        </p>
      </div>
    </Card>
  );
}
