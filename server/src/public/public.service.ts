import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  addPeriods,
  calculateSchedule,
  summarizeSchedule,
} from '../loans/loan-calculator';
import { SimulateDto } from './dto/simulate.dto';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async stats() {
    const [clients, communities] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CLIENT' } }),
      this.prisma.clientProfile.findMany({
        where: { user: { role: 'CLIENT' } },
        select: { community: true },
      }),
    ]);
    const uniqueCommunities = new Set(
      communities.map((row) => row.community?.trim()).filter(Boolean),
    );
    return {
      clients,
      communities: uniqueCommunities.size,
      since: 2018,
      years: new Date().getFullYear() - 2018,
    };
  }

  async simulate(dto: SimulateDto) {
    const settings = await this.settings.getPublic();
    const termWeeks = dto.termWeeks ?? dto.termInstallments * (dto.paymentFrequency === 'WEEKLY' ? 1 : dto.paymentFrequency === 'BIWEEKLY' ? 2 : 4);
    await this.settings.validateProduct(dto.amount, termWeeks, dto.termInstallments, dto.paymentFrequency);
    const firstDueDate = addPeriods(new Date(), dto.paymentFrequency, 1);

    const schedule = calculateSchedule(
      dto.amount,
      settings.annualRate,
      dto.termInstallments,
      dto.paymentFrequency,
      firstDueDate,
    );
    const summary = summarizeSchedule(schedule);
    return {
      annualRate: settings.annualRate,
      amount: dto.amount,
      termInstallments: dto.termInstallments,
      paymentFrequency: dto.paymentFrequency,
      ...summary,
      schedule: schedule.slice(0, 4),
    };
  }
}
