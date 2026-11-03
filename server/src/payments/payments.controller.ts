import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoansService } from '../loans/loans.service';
import { VoidPaymentDto } from './dto/void-payment.dto';

@ApiTags('Pagos')
@ApiCookieAuth('jyc_token')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK')
  list(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('loanId') loanId?: string,
  ) {
    return this.loansService.listPayments(user, from, to, loanId);
  }

  @Get('export')
  @Roles('ADMIN', 'SUPERVISOR')
  async export(
    @CurrentUser() user: any,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('loanId') loanId?: string,
    @Query('format') format?: string,
  ) {
    const csv = format === 'csv';
    const data = csv ? `\uFEFF${await this.loansService.exportCsv(user, from, to, search, loanId)}` : await this.loansService.exportWorkbook(user, from, to, search, loanId);
    res.setHeader('Content-Type', csv ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pagos-jyc-${new Date().toISOString().slice(0, 10)}.${csv ? 'csv' : 'xlsx'}"`);
    res.send(data);
  }

  @Get(':id')
  @Roles('CLIENT', 'ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.loansService.getPayment(user, id);
  }

  @Post(':id/void')
  @Roles('ADMIN')
  void(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: VoidPaymentDto,
  ) {
    return this.loansService.voidPayment(user, id, dto.reason);
  }
}
