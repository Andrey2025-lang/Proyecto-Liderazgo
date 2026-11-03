import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoansService } from './loans.service';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { AssignLoanDto } from './dto/assign-loan.dto';
import { CreatePaymentDto } from '../payments/dto/create-payment.dto';

@ApiTags('Préstamos')
@ApiCookieAuth('jyc_token')
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get('me')
  @Roles('CLIENT')
  listMine(@CurrentUser('id') clientId: string) {
    return this.loansService.listMine(clientId);
  }

  @Get('me/:id')
  @Roles('CLIENT')
  getMine(@CurrentUser('id') clientId: string, @Param('id') id: string) {
    return this.loansService.getMine(clientId, id);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK')
  listAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.loansService.listAll(user, status, search);
  }

  @Get(':id/export')
  @Roles('CLIENT', 'ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK')
  async export(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const data = await this.loansService.exportLoanWorkbook(user, id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="estado-cuenta-${id.slice(-6)}.xlsx"`);
    res.send(data);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.loansService.getOne(user, id);
  }

  @Post(':id/disburse')
  @Roles('ADMIN', 'SUPERVISOR')
  disburse(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: DisburseLoanDto,
  ) {
    return this.loansService.disburse(user, id, dto);
  }

  @Patch(':id/assign')
  @Roles('ADMIN', 'SUPERVISOR')
  assign(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AssignLoanDto,
  ) {
    return this.loansService.assignCollector(user, id, dto.collectorId);
  }

  @Post(':id/payments')
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR')
  addPayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.loansService.addPayment(user, id, dto);
  }

  @Get(':id/payments')
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR')
  listPayments(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.loansService.listPayments(user, from, to, id);
  }
}
