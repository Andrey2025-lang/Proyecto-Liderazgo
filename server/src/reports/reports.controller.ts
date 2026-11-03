import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reportes')
@ApiCookieAuth('jyc_token')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('export')
  @Roles('ADMIN', 'SUPERVISOR')
  async export(@CurrentUser() user: any, @Res() res: Response) {
    const data = await this.reportsService.exportWorkbook(user);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reportes-jyc-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(data);
  }

  @Get('dashboard')
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK')
  dashboard(@CurrentUser() user: any) {
    return this.reportsService.dashboard(user);
  }

  @Get('portfolio')
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR')
  portfolio(@CurrentUser() user: any) {
    return this.reportsService.portfolio(user);
  }

  @Get('aging')
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR')
  aging(@CurrentUser() user: any) {
    return this.reportsService.aging(user);
  }

  @Get('collections')
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR')
  collections(@CurrentUser() user: any) {
    return this.reportsService.collections(user);
  }

  @Get('communities')
  @Roles('ADMIN', 'SUPERVISOR')
  communities() {
    return this.reportsService.communities();
  }

  @Get('collectors')
  @Roles('ADMIN', 'SUPERVISOR')
  collectors() {
    return this.reportsService.collectorsPerformance();
  }
}
