import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Auditoría')
@ApiCookieAuth('jyc_token')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    return this.auditService.list(limit ? Number(limit) : 100);
  }
}
