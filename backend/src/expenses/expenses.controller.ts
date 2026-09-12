import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtPayload } from '../auth/jwt.strategy';

/**
 * Expense endpoints. All routes require ADMIN role.
 *
 * Expense data reveals the shop's cost structure and is not visible to
 * staff.
 */
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  async create(
    @Body() dto: CreateExpenseDto,
    @Req() req: { user: JwtPayload },
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.create(dto, req.user.username);
  }

  @Get()
  async findAll(@Query() query: ExpenseQueryDto): Promise<ExpenseResponseDto[]> {
    return this.expensesService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ExpenseResponseDto> {
    return this.expensesService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return this.expensesService.remove(id);
  }
}
