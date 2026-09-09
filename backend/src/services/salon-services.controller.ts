import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SalonServicesService } from './salon-services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('services')
export class SalonServicesController {
  constructor(private readonly salonServicesService: SalonServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.salonServicesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('activeOnly') activeOnly?: string): Promise<ServiceResponseDto[]> {
    if (activeOnly === 'true') {
      return this.salonServicesService.findActive();
    }
    return this.salonServicesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.salonServicesService.findById(id);
  }
}
