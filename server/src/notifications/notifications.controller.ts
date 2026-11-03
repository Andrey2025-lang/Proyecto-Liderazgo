import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notificaciones')
@ApiCookieAuth('jyc_token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.notificationsService.list(userId);
  }

  @Patch('read-all')
  markAll(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }
}
