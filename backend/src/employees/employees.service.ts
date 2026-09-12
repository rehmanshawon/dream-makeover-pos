import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { EmployeeStatus } from './employee-status.enum';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    const employee = this.employeeRepository.create({
      fullName: dto.fullName,
      role: dto.role,
      salaryMinor: dto.salaryMinor,
      salaryFrequency: dto.salaryFrequency,
      joinDate: dto.joinDate,
      status: dto.status ?? EmployeeStatus.ACTIVE,
      phone: dto.phone ?? null,
      note: dto.note ?? null,
    });

    const saved = await this.employeeRepository.save(employee);
    return this.toResponseDto(saved);
  }

  async findAll(status?: EmployeeStatus): Promise<EmployeeResponseDto[]> {
    const where = status ? { status } : {};
    const employees = await this.employeeRepository.find({
      where,
      order: { fullName: 'ASC' },
    });
    return employees.map((e) => this.toResponseDto(e));
  }

  async findById(id: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return this.toResponseDto(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (dto.fullName !== undefined) employee.fullName = dto.fullName;
    if (dto.role !== undefined) employee.role = dto.role;
    if (dto.salaryMinor !== undefined) employee.salaryMinor = dto.salaryMinor;
    if (dto.salaryFrequency !== undefined) employee.salaryFrequency = dto.salaryFrequency;
    if (dto.phone !== undefined) employee.phone = dto.phone;
    if (dto.note !== undefined) employee.note = dto.note;
    if (dto.status !== undefined) employee.status = dto.status;

    const saved = await this.employeeRepository.save(employee);
    return this.toResponseDto(saved);
  }

  /**
   * Soft-deletes an employee by marking them INACTIVE.
   *
   * The row is never physically removed because salary payment records
   * reference it. Physical deletion would destroy historical data.
   */
  async deactivate(id: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.status === EmployeeStatus.INACTIVE) {
      return this.toResponseDto(employee);
    }

    employee.status = EmployeeStatus.INACTIVE;
    const saved = await this.employeeRepository.save(employee);
    return this.toResponseDto(saved);
  }

  private toResponseDto(employee: Employee): EmployeeResponseDto {
    return {
      id: employee.id,
      fullName: employee.fullName,
      role: employee.role,
      salaryMinor: employee.salaryMinor,
      salaryFrequency: employee.salaryFrequency,
      joinDate: employee.joinDate,
      status: employee.status,
      phone: employee.phone,
      note: employee.note,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
