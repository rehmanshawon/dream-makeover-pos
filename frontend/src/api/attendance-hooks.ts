import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { attendanceApi } from './attendance';
import type { AttendanceRecord, AttendanceStatus } from '../types/attendance';

export const attendanceKeys = {
  all: ['attendance'] as const,
  forEmployee: (employeeId: string, from: string, to: string) =>
    [...attendanceKeys.all, 'employee', employeeId, from, to] as const,
};

export function useAttendance(
  employeeId: string | undefined,
  from: string,
  to: string,
): UseQueryResult<AttendanceRecord[], Error> {
  return useQuery({
    queryKey: attendanceKeys.forEmployee(employeeId ?? '', from, to),
    queryFn: () => attendanceApi.listForEmployee(employeeId as string, from, to),
    enabled: Boolean(employeeId),
  });
}

export function useUpsertAttendance(): UseMutationResult<
  AttendanceRecord,
  Error,
  {
    employeeId: string;
    date: string;
    status: AttendanceStatus;
    note?: string;
    from: string;
    to: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, date, status, note }) =>
      attendanceApi.upsert(employeeId, date, status, note),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: attendanceKeys.forEmployee(variables.employeeId, variables.from, variables.to),
      });
      void queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteAttendance(): UseMutationResult<
  void,
  Error,
  { employeeId: string; date: string; from: string; to: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, date }) => attendanceApi.remove(employeeId, date),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: attendanceKeys.forEmployee(variables.employeeId, variables.from, variables.to),
      });
      void queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}
