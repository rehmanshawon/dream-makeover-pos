import { Employee } from '../src/employees/employee.entity';
import { SalaryFrequency } from '../src/employees/salary-frequency.enum';
import { EmployeeStatus } from '../src/employees/employee-status.enum';
import { describe, expect, it } from '@jest/globals';

describe('Employee entity', () => {
  it('should default to ACTIVE status', () => {
    const employee = new Employee();
    expect(employee.status).toBe(EmployeeStatus.ACTIVE);
  });

  it('should default nullable fields to null', () => {
    const employee = new Employee();
    expect(employee.phone).toBeNull();
    expect(employee.note).toBeNull();
  });

  it('should have an undefined ID before database insertion', () => {
    const employee = new Employee();
    expect(employee.id).toBeUndefined();
  });

  it('should store salary in minor units', () => {
    const employee = new Employee();
    employee.salaryMinor = 3500000;
    employee.salaryFrequency = SalaryFrequency.MONTHLY;
    expect(employee.salaryMinor).toBe(3500000);
    expect(employee.salaryFrequency).toBe(SalaryFrequency.MONTHLY);
  });

  it('should support all salary frequencies', () => {
    expect(SalaryFrequency.MONTHLY).toBe('MONTHLY');
    expect(SalaryFrequency.WEEKLY).toBe('WEEKLY');
    expect(SalaryFrequency.DAILY).toBe('DAILY');
  });

  it('should support both statuses', () => {
    expect(EmployeeStatus.ACTIVE).toBe('ACTIVE');
    expect(EmployeeStatus.INACTIVE).toBe('INACTIVE');
  });
});
