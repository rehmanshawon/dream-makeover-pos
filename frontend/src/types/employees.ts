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
  nidOrBirthCertificate?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
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
  nidOrBirthCertificate?: string;
  presentAddress?: string;
  permanentAddress?: string;
  note?: string;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  role?: string;
  salaryMinor?: number;
  salaryFrequency?: SalaryFrequency;
  phone?: string;
  nidOrBirthCertificate?: string;
  presentAddress?: string;
  permanentAddress?: string;
  note?: string;
  status?: EmployeeStatus;
}
