import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { SettingsService } from '../settings/settings.service';
import { SimulateDto } from './dto/simulate.dto';

@ApiTags('Público')
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('settings')
  settings() {
    return this.settingsService.getPublic();
  }

  @Get('stats')
  stats() {
    return this.publicService.stats();
  }

  @Post('simulate')
  simulate(@Body() dto: SimulateDto) {
    return this.publicService.simulate(dto);
  }
}
