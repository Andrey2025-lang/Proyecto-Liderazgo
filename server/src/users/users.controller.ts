import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('Usuarios')
@ApiCookieAuth('jyc_token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  list() {
    return this.usersService.list();
  }

  @Get('collectors')
  @Roles('ADMIN', 'SUPERVISOR', 'CLERK')
  collectors() {
    return this.usersService.listCollectors();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: string) {
    return this.usersService.create(dto, actorId);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.updateStatus(id, dto.status, actorId);
  }
}
