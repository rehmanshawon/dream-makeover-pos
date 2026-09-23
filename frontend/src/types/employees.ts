export type SalaryFrequency = 'MONTHLY' | 'WEEKLY' | 'DAILY';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  salaryMinor: number;
  salaryFrequency: SalaryFrequency;
  joinDate: string;
  status: EmployeeStatus;
  phone: string | null;
  note: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  fullName: string;
  role: string;
  salaryMinor: number;
  salaryFrequency: SalaryFrequency;
  joinDate: string;
  phone?: string;
  note?: string;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  role?: string;
  salaryMinor?: number;
  salaryFrequency?: SalaryFrequency;
  phone?: string;
  note?: string;
  status?: EmployeeStatus;
}
