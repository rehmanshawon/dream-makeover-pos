import { useMemo, type JSX } from 'react';
import { Select, type SelectOption } from '../../../ui/Select';
import { Spinner } from '../../../ui/Spinner';
import { useAttendance, useUpsertAttendance } from '../../../api/attendance-hooks';
import { ATTENDANCE_LABELS, type AttendanceStatus } from '../../../types/attendance';
import './AttendanceEditor.css';

interface AttendanceEditorProps {
  employeeId: string;
  from: string;
  to: string;
  /** Restrict editing when the pay period is closed. */
  disabled?: boolean;
}

const STATUS_OPTIONS: SelectOption[] = (Object.keys(ATTENDANCE_LABELS) as AttendanceStatus[]).map(
  (key) => ({ value: key, label: ATTENDANCE_LABELS[key] }),
);

function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const [fy = 0, fm = 1, fd = 1] = from.split('-').map(Number);
  const [ty = 0, tm = 1, td = 1] = to.split('-').map(Number);
  const cursor = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function formatDay(iso: string): string {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export function AttendanceEditor({
  employeeId,
  from,
  to,
  disabled = false,
}: AttendanceEditorProps): JSX.Element {
  const { data, isLoading, error } = useAttendance(employeeId, from, to);
  const upsert = useUpsertAttendance();

  const byDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const r of data ?? []) {
      map.set(r.date, r.status);
    }
    return map;
  }, [data]);

  const dates = useMemo(() => enumerateDates(from, to), [from, to]);

  const handleChange = (date: string, status: AttendanceStatus): void => {
    upsert.mutate({ employeeId, date, status, from, to });
  };

  if (isLoading) {
    return (
      <div className="attendance-editor__center">
        <Spinner label="Loading attendance" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-editor__error" role="alert">
        Unable to load attendance.
      </div>
    );
  }

  return (
    <div className="attendance-editor">
      {dates.map((date) => {
        const current = byDate.get(date) ?? '';
        return (
          <div key={date} className="attendance-editor__row">
            <span className="attendance-editor__day">{formatDay(date)}</span>
            <div className="attendance-editor__control">
              <Select
                options={[{ value: '', label: '— Not recorded —' }, ...STATUS_OPTIONS]}
                value={current}
                onChange={(e) => handleChange(date, e.target.value as AttendanceStatus)}
                disabled={disabled || upsert.isPending}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
