import { useEffect, useMemo, useState, type JSX } from 'react';
import { Select, type SelectOption } from '../../../ui/Select';
import { Button } from '../../../ui/Button';
import { Spinner } from '../../../ui/Spinner';
import { useAttendance, useAttendanceSummary } from '../../../api/attendance-hooks';
import { attendanceApi } from '../../../api/attendance';
import { ApiError } from '../../../api/api-error';
import { ATTENDANCE_LABELS, type AttendanceStatus } from '../../../types/attendance';
import './AttendanceEditor.css';

interface AttendanceEditorProps {
  employeeId: string;
  from: string;
  to: string;
  disabled?: boolean;
  onSaved?: () => void;
}

const STATUS_OPTIONS: SelectOption[] = (Object.keys(ATTENDANCE_LABELS) as AttendanceStatus[]).map(
  (key) => ({ value: key, label: ATTENDANCE_LABELS[key] }),
);

function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
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
  const [y, m, d] = iso.split('-').map(Number);
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
  onSaved,
}: AttendanceEditorProps): JSX.Element {
  const { data, isLoading, error, refetch } = useAttendance(employeeId, from, to);

  const [pending, setPending] = useState<Map<string, AttendanceStatus>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const now = new Date();
  const summaryQuery = useAttendanceSummary(employeeId, now.getFullYear(), now.getMonth() + 1);

  useEffect(() => {
    setPending(new Map());
    setSaveError(null);
    setSaved(false);
  }, [employeeId, from, to]);

  const committedByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const r of data ?? []) map.set(r.date, r.status);
    return map;
  }, [data]);

  const dates = useMemo(() => enumerateDates(from, to), [from, to]);

  const valueFor = (date: string): string => {
    if (pending.has(date)) return pending.get(date) as string;
    return committedByDate.get(date) ?? '';
  };

  const handleChange = (date: string, status: AttendanceStatus): void => {
    setPending((prev) => {
      const next = new Map(prev);
      if (status === (committedByDate.get(date) ?? '')) {
        next.delete(date);
      } else {
        next.set(date, status);
      }
      return next;
    });
    setSaved(false);
  };

  const handleSave = async (): Promise<void> => {
    if (pending.size === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await attendanceApi.upsertBulk(
        employeeId,
        Array.from(pending.entries()).map(([date, status]) => ({
          date,
          status,
        })),
      );
      setPending(new Map());
      setSaved(true);
      await refetch();
      onSaved?.();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Unable to save attendance.');
    } finally {
      setSaving(false);
    }
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
      {summaryQuery.data && (
        <div className="attendance-editor__summary">
          <div className="attendance-editor__summary-item">
            <span className="attendance-editor__summary-label">Present</span>
            <span className="attendance-editor__summary-value">{summaryQuery.data.present}</span>
          </div>
          <div className="attendance-editor__summary-item">
            <span className="attendance-editor__summary-label">Absent</span>
            <span className="attendance-editor__summary-value">{summaryQuery.data.absent}</span>
          </div>
          <div className="attendance-editor__summary-item">
            <span className="attendance-editor__summary-label">Half day</span>
            <span className="attendance-editor__summary-value">{summaryQuery.data.halfDay}</span>
          </div>
          <div className="attendance-editor__summary-item">
            <span className="attendance-editor__summary-label">Leave</span>
            <span className="attendance-editor__summary-value">{summaryQuery.data.leave}</span>
          </div>
          <div className="attendance-editor__summary-item">
            <span className="attendance-editor__summary-label">Not recorded</span>
            <span className="attendance-editor__summary-value">
              {summaryQuery.data.notRecorded}
            </span>
          </div>
        </div>
      )}
      <div className="attendance-editor__days">
        {dates.map((date) => (
          <div key={date} className="attendance-editor__row">
            <span className="attendance-editor__day">{formatDay(date)}</span>
            <div className="attendance-editor__control">
              <Select
                options={[{ value: '', label: '— Not recorded —' }, ...STATUS_OPTIONS]}
                value={valueFor(date)}
                onChange={(e) => handleChange(date, e.target.value as AttendanceStatus)}
                disabled={disabled || saving}
              />
            </div>
          </div>
        ))}
      </div>

      {saveError && (
        <div className="attendance-editor__error" role="alert">
          {saveError}
        </div>
      )}

      {saved && pending.size === 0 && (
        <div className="attendance-editor__success" role="status">
          Attendance saved.
        </div>
      )}

      <div className="attendance-editor__actions">
        <span className="attendance-editor__count">
          {pending.size > 0
            ? `${pending.size} change${pending.size === 1 ? '' : 's'} pending`
            : 'No changes'}
        </span>
        <Button
          onClick={handleSave}
          disabled={disabled || pending.size === 0 || saving}
          loading={saving}
        >
          Save attendance
        </Button>
      </div>
    </div>
  );
}
