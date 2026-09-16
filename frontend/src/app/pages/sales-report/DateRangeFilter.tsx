import { useState, type JSX } from 'react';
import { Input } from '../../../ui/Input';
import './DateRangeFilter.css';

export type RangePreset = 'today' | 'this_week' | 'this_month' | 'previous_month' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangeFilterProps {
  value: { preset: RangePreset; range: DateRange };
  onChange: (value: { preset: RangePreset; range: DateRange }) => void;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function resolvePreset(preset: RangePreset): DateRange {
  const now = new Date();

  if (preset === 'today') {
    const iso = isoDate(now);
    return { from: iso, to: iso };
  }

  if (preset === 'this_week') {
    const dayOfWeek = now.getDay();
    const offsetToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - offsetToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: isoDate(monday), to: isoDate(sunday) };
  }

  if (preset === 'this_month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: isoDate(first), to: isoDate(last) };
  }

  if (preset === 'previous_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: isoDate(first), to: isoDate(last) };
  }

  // custom — caller supplies range separately
  const iso = isoDate(now);
  return { from: iso, to: iso };
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This week' },
  { key: 'this_month', label: 'This month' },
  { key: 'previous_month', label: 'Previous month' },
  { key: 'custom', label: 'Custom' },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps): JSX.Element {
  const [customFrom, setCustomFrom] = useState(value.range.from);
  const [customTo, setCustomTo] = useState(value.range.to);

  const handlePreset = (preset: RangePreset): void => {
    if (preset === 'custom') {
      onChange({ preset, range: { from: customFrom, to: customTo } });
      return;
    }
    onChange({ preset, range: resolvePreset(preset) });
  };

  const handleCustomChange = (from: string, to: string): void => {
    setCustomFrom(from);
    setCustomTo(to);
    if (value.preset === 'custom' && from && to) {
      onChange({ preset: 'custom', range: { from, to } });
    }
  };

  return (
    <div className="date-range">
      <div className="date-range__presets" role="group" aria-label="Date range presets">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`date-range__chip${
              value.preset === p.key ? ' date-range__chip--active' : ''
            }`}
            onClick={() => handlePreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className="date-range__custom">
          <Input
            label="From"
            type="date"
            value={customFrom}
            onChange={(e) => handleCustomChange(e.target.value, customTo)}
          />
          <Input
            label="To"
            type="date"
            value={customTo}
            onChange={(e) => handleCustomChange(customFrom, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
