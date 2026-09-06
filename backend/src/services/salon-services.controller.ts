import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SalonServicesService } from './salon-services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';

@Controller('services')
export class SalonServicesController {
  constructor(private readonly salonServicesService: SalonServicesService) {}

  @Post()
  async create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.salonServicesService.create(dto);
  }

  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string): Promise<ServiceResponseDto[]> {
    if (activeOnly === 'true') {
      return this.salonServicesService.findActive();
    }
    return this.salonServicesService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.salonServicesService.findById(id);
  }
}
