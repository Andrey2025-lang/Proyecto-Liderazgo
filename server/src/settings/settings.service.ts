import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PERSONAL_LOAN_AMOUNTS } from '../common/loan-products';

const DEFAULTS: Record<string, string> = {
  minAmount: '50000',
  maxAmount: '100000',
  annualRate: '5',
  loanAmounts: PERSONAL_LOAN_AMOUNTS.join(','),
  minTerm: '1',
  maxTerm: '8',
  contactPhone: '8515-7835',
  contactPhone2: '6272-2143',
  contactPhone3: '8812-6956',
  contactEmail: 'info@jycprestamos.cr',
  address: 'Nandayure, Guanacaste, Costa Rica',
  hours: 'Lunes a viernes, 8:00 a.m. a 5:00 p.m.',
  heroTitle: 'Crédito cercano, claro y a tu ritmo.',
  heroSubtitle:
    'Préstamos personales para las comunidades de la Península de Nicoya, con acompañamiento de principio a fin.',
  privacyVersion: '2026-10',
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getPublic() {
    const settings = await this.getAll();
    return {
      minAmount: Number(settings.minAmount),
      maxAmount: Number(settings.maxAmount),
      annualRate: Number(settings.annualRate),
      minTerm: Number(settings.minTerm),
      maxTerm: Number(settings.maxTerm),
      loanAmounts: settings.loanAmounts.split(',').map(Number),
      contactPhone: settings.contactPhone,
      contactPhone2: settings.contactPhone2,
      contactPhone3: settings.contactPhone3,
      contactEmail: settings.contactEmail,
      address: settings.address,
      hours: settings.hours,
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      privacyVersion: settings.privacyVersion,
    };
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    return rows.reduce(
      (acc, row) => ({ ...acc, [row.key]: row.value }),
      { ...DEFAULTS },
    );
  }

  async update(dto: UpdateSettingsDto, userId: string) {
    const merged = { ...(await this.getAll()), ...dto };
    const amounts = merged.loanAmounts.split(',').map((value) => Number(value.trim()));
    if (!amounts.length || amounts.length > 20 || amounts.some((value) => !Number.isFinite(value) || value < 1 || value > 10000000 || !Number.isInteger(value * 100))) {
      throw new BadRequestException('Ingresá de 1 a 20 montos positivos separados por comas (máximo ₡10.000.000).');
    }
    const rate = Number(merged.annualRate);
    const min = Number(merged.minTerm);
    const max = Number(merged.maxTerm);
    if (!merged.annualRate.trim() || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new BadRequestException('El interés total debe estar entre 0 y 100 %.');
    }
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min || max > 104) {
      throw new BadRequestException('Los plazos deben ser semanas enteras entre 1 y 104, con mínimo menor o igual al máximo.');
    }
    const sorted = [...new Set(amounts)].sort((a, b) => a - b);
    const entries = Object.entries({ ...dto, loanAmounts: sorted.join(','), minAmount: String(sorted[0]), maxAmount: String(sorted[sorted.length - 1]) }).filter(([, value]) => value !== undefined);
    await this.prisma.$transaction(entries.map(([key, value]) => this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })));
    await this.audit.log(userId, 'UPDATE_SETTINGS', 'Setting', undefined, {
      keys: entries.map(([key]) => key),
    });
    return this.getAll();
  }

  async validateProduct(amount: number, termWeeks: number, installments: number, frequency: string) {
    const settings = await this.getPublic();
    if (!settings.loanAmounts.includes(amount)) throw new BadRequestException('El monto no está disponible. Revisá las condiciones actuales.');
    if (!Number.isInteger(termWeeks) || termWeeks < settings.minTerm || termWeeks > settings.maxTerm) {
      throw new BadRequestException(`El plazo debe ser de ${settings.minTerm} a ${settings.maxTerm} semanas.`);
    }
    const weeksPerPeriod: Record<string, number> = { WEEKLY: 1, BIWEEKLY: 2, MONTHLY: 4 };
    const period = weeksPerPeriod[frequency];
    if (!period) throw new BadRequestException('La frecuencia de pago no es válida.');
    if (termWeeks % period !== 0) {
      throw new BadRequestException(
        frequency === 'MONTHLY'
          ? 'Con pago mensual el plazo debe ser en meses completos (múltiplos de 4 semanas).'
          : 'Con pago quincenal el plazo debe ser en quincenas completas (múltiplos de 2 semanas).',
      );
    }
    const expected = termWeeks / period;
    if (installments !== expected) throw new BadRequestException('La cantidad de cuotas no coincide con el plazo y la frecuencia.');
  }
}
