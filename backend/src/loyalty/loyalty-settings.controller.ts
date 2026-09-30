import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { LoyaltySettings } from './loyalty-settings.entity';
import { LoyaltySettingsService } from './loyalty-settings.service';
import { UpdateLoyaltySettingsDto } from './dto/update-loyalty-settings.dto';

@Controller('loyalty-settings')
@UseGuards(JwtAuthGuard)
export class LoyaltySettingsController {
  constructor(private readonly loyaltySettingsService: LoyaltySettingsService) {}

  @Get()
  get(): Promise<LoyaltySettings> {
    return this.loyaltySettingsService.get();
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Body() dto: UpdateLoyaltySettingsDto): Promise<LoyaltySettings> {
    return this.loyaltySettingsService.update(dto);
  }
}
