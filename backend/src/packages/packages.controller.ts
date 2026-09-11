import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { PackageResponseDto } from './dto/package-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreatePackageDto): Promise<PackageResponseDto> {
    return this.packagesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('activeOnly') activeOnly?: string): Promise<PackageResponseDto[]> {
    if (activeOnly === 'true') {
      return this.packagesService.findActive();
    }
    return this.packagesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string): Promise<PackageResponseDto> {
    return this.packagesService.findById(id);
  }
}
