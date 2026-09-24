import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendanceEditor } from './AttendanceEditor';
import { renderWithProviders } from '../../../test/render-with-providers';

const { upsertBulk, remove, refetch, getAttendanceData } = vi.hoisted(() => ({
  upsertBulk: vi.fn(),
  remove: vi.fn(),
  refetch: vi.fn(),
  getAttendanceData: vi.fn(() => [] as Array<{ date: string; status: 'PRESENT' }>),
}));

vi.mock('../../../api/attendance-hooks', () => ({
  useAttendance: () => ({
    data: getAttendanceData(),
    isLoading: false,
    error: null,
    refetch,
  }),
  useAttendanceSummary: () => ({
    data: {
      present: 4,
      absent: 1,
      halfDay: 2,
      leave: 1,
      notRecorded: 22,
      totalDaysInMonth: 30,
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../api/attendance', () => ({
  attendanceApi: {
    upsertBulk,
    remove,
  },
}));

describe('AttendanceEditor', () => {
  it('shows the summary, tracks pending day changes, and saves with upsertBulk', async () => {
    const user = userEvent.setup();
    upsertBulk.mockResolvedValue([]);
    refetch.mockResolvedValue(undefined);
    renderWithProviders(
      <AttendanceEditor employeeId="employee-1" from="2026-09-01" to="2026-09-02" />,
    );

    expect(screen.getAllByText('Present')).not.toHaveLength(0);
    expect(screen.getAllByText('Absent')).not.toHaveLength(0);
    expect(screen.getAllByText('Half day')).not.toHaveLength(0);
    expect(screen.getAllByText('Leave')).not.toHaveLength(0);
    expect(screen.getAllByText('Not recorded')).not.toHaveLength(0);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();

    expect(screen.getAllByRole('radio')).toHaveLength(10);
    await user.click(screen.getAllByRole('radio', { name: 'Present' })[0]!);
    expect(screen.getByText('1 change pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save attendance' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Save attendance' }));

    expect(upsertBulk).toHaveBeenCalledWith('employee-1', [
      { date: '2026-09-01', status: 'PRESENT' },
    ]);
    expect(await screen.findByRole('status')).toHaveTextContent('Attendance saved.');
  });

  it('removes a recorded attendance day when Not Recorded is selected', async () => {
    const user = userEvent.setup();
    remove.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    getAttendanceData.mockReturnValue([{ date: '2026-09-01', status: 'PRESENT' }]);
    renderWithProviders(
      <AttendanceEditor employeeId="employee-1" from="2026-09-01" to="2026-09-01" />,
    );

    await user.click(screen.getByRole('radio', { name: 'Not Recorded' }));
    await user.click(screen.getByRole('button', { name: 'Save attendance' }));

    expect(remove).toHaveBeenCalledWith('employee-1', '2026-09-01');
    expect(upsertBulk).not.toHaveBeenCalled();
  });
});
