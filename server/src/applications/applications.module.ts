import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
