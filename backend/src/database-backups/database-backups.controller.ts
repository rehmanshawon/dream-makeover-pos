import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { DatabaseBackupsService } from './database-backups.service';

@Controller('database-backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DatabaseBackupsController {
  constructor(private readonly databaseBackupsService: DatabaseBackupsService) {}

  @Get()
  async download(@Res() response: Response): Promise<void> {
    await this.databaseBackupsService.download(response);
  }

  @Post('restore')
  @UseInterceptors(
    FileInterceptor('backup', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_request, _file, callback) => callback(null, `${randomUUID()}.zip`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        callback(null, file.originalname.toLowerCase().endsWith('.zip'));
      },
    }),
  )
  async restore(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('confirmReplace') confirmReplace: string | undefined,
  ): Promise<{ message: string }> {
    if (!file) {
      throw new BadRequestException('Select a Dream Makeover backup ZIP file.');
    }

    try {
      if (confirmReplace !== 'true') {
        throw new BadRequestException('Explicit confirmation is required to replace all data.');
      }
      await this.databaseBackupsService.restore(file.path);
      return { message: 'Backup restored successfully.' };
    } finally {
      await rm(file.path, { force: true });
    }
  }
}
