import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Configuración')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  getPublic() {
    return this.settingsService.getPublic();
  }

  @Get()
  @ApiCookieAuth('jyc_token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAll() {
    return this.settingsService.getAll();
  }

  @Put()
  @ApiCookieAuth('jyc_token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Body() dto: UpdateSettingsDto, @CurrentUser('id') userId: string) {
    return this.settingsService.update(dto, userId);
  }
}
