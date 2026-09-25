import { useEffect, useMemo, useState, type JSX } from 'react';
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
  joinDate?: string;
  disabled?: boolean;
  onSaved?: () => void;
  onClose?: () => void;
}

const STATUS_OPTIONS = Object.keys(ATTENDANCE_LABELS) as AttendanceStatus[];

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

function todayAsIso(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
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
  joinDate,
  disabled = false,
  onSaved,
  onClose,
}: AttendanceEditorProps): JSX.Element {
  const effectiveFrom = joinDate && joinDate > from ? joinDate : from;
  const { data, isLoading, error, refetch } = useAttendance(employeeId, effectiveFrom, to);

  const [pending, setPending] = useState<Map<string, AttendanceStatus | ''>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [periodYear = 0, periodMonth = 0] = effectiveFrom.split('-').map(Number);
  const summaryQuery = useAttendanceSummary(employeeId, periodYear, periodMonth);

  useEffect(() => {
    setPending(new Map());
    setSaveError(null);
    setSaved(false);
  }, [employeeId, effectiveFrom, to]);

  const committedByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const r of data ?? []) map.set(r.date, r.status);
    return map;
  }, [data]);

  const dates = useMemo(() => {
    const today = todayAsIso();
    const visibleTo = to < today ? to : today;
    return effectiveFrom <= visibleTo ? enumerateDates(effectiveFrom, visibleTo) : [];
  }, [effectiveFrom, to]);

  const valueFor = (date: string): string => {
    if (pending.has(date)) return pending.get(date) as string;
    return committedByDate.get(date) ?? '';
  };

  const handleChange = (date: string, status: AttendanceStatus | ''): void => {
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
      const updates = Array.from(pending.entries());
      const entries = updates
        .filter(([, status]) => status !== '')
        .map(([date, status]) => ({ date, status: status as AttendanceStatus }));
      const removals = updates.filter(([, status]) => status === '').map(([date]) => date);
      await Promise.all([
        entries.length > 0 ? attendanceApi.upsertBulk(employeeId, entries) : Promise.resolve(),
        ...removals.map((date) => attendanceApi.remove(employeeId, date)),
      ]);
      setPending(new Map());
      setSaved(true);
      await Promise.all([refetch(), summaryQuery.refetch()]);
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
            <fieldset className="attendance-editor__options" disabled={disabled || saving}>
              <legend className="attendance-editor__visually-hidden">
                Attendance for {formatDay(date)}
              </legend>
              <label className="attendance-editor__option">
                <input
                  type="radio"
                  name={`attendance-${date}`}
                  value=""
                  checked={valueFor(date) === ''}
                  onChange={() => handleChange(date, '')}
                />
                <span>Not Recorded</span>
              </label>
              {STATUS_OPTIONS.map((status) => (
                <label key={status} className="attendance-editor__option">
                  <input
                    type="radio"
                    name={`attendance-${date}`}
                    value={status}
                    checked={valueFor(date) === status}
                    onChange={() => handleChange(date, status)}
                  />
                  <span>{ATTENDANCE_LABELS[status]}</span>
                </label>
              ))}
            </fieldset>
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
        <div className="attendance-editor__action-buttons">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={disabled || pending.size === 0 || saving}
            loading={saving}
          >
            Save attendance
          </Button>
        </div>
      </div>
    </div>
  );
}
