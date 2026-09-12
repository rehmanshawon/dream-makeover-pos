import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EmployeesService } from '../src/employees/employees.service';
import { Employee } from '../src/employees/employee.entity';
import { EmployeeStatus } from '../src/employees/employee-status.enum';
import { SalaryFrequency } from '../src/employees/salary-frequency.enum';
import { CreateEmployeeDto } from '../src/employees/dto/create-employee.dto';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let repository: Repository<Employee>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EmployeesService);
    repository = module.get(getRepositoryToken(Employee));
  });

  it('creates employee with ACTIVE status by default', async () => {
    const dto: CreateEmployeeDto = {
      fullName: 'Rina Akter',
      role: 'Senior Stylist',
      salaryMinor: 3500000,
      salaryFrequency: SalaryFrequency.MONTHLY,
      joinDate: '2025-06-15',
    };

    const saved = {
      id: 'emp-1',
      ...dto,
      status: EmployeeStatus.ACTIVE,
      phone: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Employee;

    jest.spyOn(repository, 'create').mockReturnValue(saved);
    jest.spyOn(repository, 'save').mockResolvedValue(saved);

    const result = await service.create(dto);

    expect(result.status).toBe(EmployeeStatus.ACTIVE);
    expect(result.salaryMinor).toBe(3500000);
    expect(result.joinDate).toBe('2025-06-15');
  });

  it('throws NotFoundException when employee does not exist', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('deactivates an active employee', async () => {
    const employee = {
      id: 'emp-1',
      fullName: 'Rina Akter',
      role: 'Senior Stylist',
      salaryMinor: 3500000,
      salaryFrequency: SalaryFrequency.MONTHLY,
      joinDate: '2025-06-15',
      status: EmployeeStatus.ACTIVE,
      phone: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Employee;

    jest.spyOn(repository, 'findOne').mockResolvedValue(employee);
    jest.spyOn(repository, 'save').mockImplementation(async (e) => e as Employee);

    const result = await service.deactivate('emp-1');

    expect(result.status).toBe(EmployeeStatus.INACTIVE);
  });

  it('is idempotent when deactivating an already inactive employee', async () => {
    const employee = {
      id: 'emp-1',
      status: EmployeeStatus.INACTIVE,
      fullName: 'Rina Akter',
      role: 'Senior Stylist',
      salaryMinor: 3500000,
      salaryFrequency: SalaryFrequency.MONTHLY,
      joinDate: '2025-06-15',
      phone: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Employee;

    jest.spyOn(repository, 'findOne').mockResolvedValue(employee);
    const saveSpy = jest.spyOn(repository, 'save').mockImplementation(async (e) => e as Employee);

    const result = await service.deactivate('emp-1');

    expect(result.status).toBe(EmployeeStatus.INACTIVE);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('filters employees by status when requested', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([]);
    await service.findAll(EmployeeStatus.ACTIVE);

    expect(repository.find).toHaveBeenCalledWith({
      where: { status: EmployeeStatus.ACTIVE },
      order: { fullName: 'ASC' },
    });
  });
});
