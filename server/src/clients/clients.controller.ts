import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssignCollectorDto } from './dto/assign-collector.dto';
import { RegisterDto } from '../auth/dto/register.dto';

@ApiTags('Clientes')
@ApiCookieAuth('jyc_token')
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'CLERK')
  create(@CurrentUser('id') actorId: string, @Body() dto: RegisterDto) {
    return this.clientsService.create(dto, actorId);
  }

  @Get('me')
  @Roles('CLIENT')
  getMe(@CurrentUser('id') userId: string) {
    return this.clientsService.getMe(userId);
  }

  @Patch('me')
  @Roles('CLIENT')
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.clientsService.updateMe(userId, dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK')
  list(@CurrentUser() user: any) {
    return this.clientsService.list(user);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clientsService.getOne(user, id);
  }

  @Patch(':id/assign')
  @Roles('ADMIN', 'SUPERVISOR')
  assign(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AssignCollectorDto,
  ) {
    return this.clientsService.assignCollector(user, id, dto.collectorId);
  }
}
