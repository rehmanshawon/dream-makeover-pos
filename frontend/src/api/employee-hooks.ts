import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { employeesApi } from './employees';
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeStatus,
} from '../types/employees';

export const employeeKeys = {
  all: ['employees'] as const,
  list: (status?: EmployeeStatus) => [...employeeKeys.all, 'list', status ?? 'all'] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
};

export function useEmployees(status?: EmployeeStatus): UseQueryResult<Employee[], Error> {
  return useQuery({
    queryKey: employeeKeys.list(status),
    queryFn: () => employeesApi.list(status),
  });
}

export function useEmployee(id: string | undefined): UseQueryResult<Employee, Error> {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? ''),
    queryFn: () => employeesApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateEmployee(): UseMutationResult<Employee, Error, CreateEmployeeRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => employeesApi.create(payload),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.setQueryData(employeeKeys.detail(created.id), created);
    },
  });
}

export function useUpdateEmployee(): UseMutationResult<
  Employee,
  Error,
  { id: string; payload: UpdateEmployeeRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => employeesApi.update(id, payload),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.setQueryData(employeeKeys.detail(updated.id), updated);
    },
  });
}

export function useDeactivateEmployee(): UseMutationResult<Employee, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.deactivate(id),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.setQueryData(employeeKeys.detail(updated.id), updated);
    },
  });
}

export function useUploadEmployeePhoto(): UseMutationResult<
  Employee,
  Error,
  { id: string; photo: File }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, photo }) => employeesApi.uploadPhoto(id, photo),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.setQueryData(employeeKeys.detail(updated.id), updated);
    },
  });
}
