import { api } from './api-client';
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeStatus,
} from '../types/employees';

export const employeesApi = {
  list(status?: EmployeeStatus): Promise<Employee[]> {
    const query = status ? `?status=${status}` : '';
    return api.get<Employee[]>(`/employees${query}`);
  },

  getById(id: string): Promise<Employee> {
    return api.get<Employee>(`/employees/${id}`);
  },

  create(payload: CreateEmployeeRequest): Promise<Employee> {
    return api.post<Employee>('/employees', payload);
  },

  update(id: string, payload: UpdateEmployeeRequest): Promise<Employee> {
    return api.patch<Employee>(`/employees/${id}`, payload);
  },

  deactivate(id: string): Promise<Employee> {
    return api.delete<Employee>(`/employees/${id}`);
  },
};
