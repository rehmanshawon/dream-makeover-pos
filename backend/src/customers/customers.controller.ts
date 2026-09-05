import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Body() dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    return this.customersService.create(dto);
  }

  @Get()
  async findAll(): Promise<CustomerResponseDto[]> {
    return this.customersService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<CustomerResponseDto> {
    return this.customersService.findById(id);
  }
}
