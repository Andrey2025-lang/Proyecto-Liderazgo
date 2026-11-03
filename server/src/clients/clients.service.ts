import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { summarizeLoan } from '../loans/loan.utils';

type AuthUser = { id: string; role: string };

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: RegisterDto, actorId: string) {
    if (!dto.acceptPrivacy) throw new BadRequestException('Debe constar el consentimiento del cliente.');
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }) || await this.prisma.clientProfile.findUnique({ where: { cedula: dto.cedula } })) throw new ConflictException('El correo o la cédula ya están registrados.');
    const client = await this.prisma.user.create({ data: {
      email, name: dto.name.trim(), phone: dto.phone, role: 'CLIENT', passwordHash: await bcrypt.hash(dto.password, 10),
      profile: { create: { cedula: dto.cedula, community: dto.community, occupation: dto.occupation } },
      consents: { create: [{ type: 'PRIVACY', version: '2026-10' }, ...(dto.acceptEquifax ? [{ type: 'EQUIFAX', version: '2026-10' }] : [])] },
    }, include: { profile: true } });
    await this.audit.log(actorId, 'REGISTER_ASSISTED_CLIENT', 'User', client.id);
    return this.sanitize(client);
  }

  async list(user: AuthUser) {
    const where: any = { role: 'CLIENT' };

    if (user.role === 'COLLECTOR') {
      where.OR = [
        { profile: { assignedCollectorId: user.id } },
        { clientLoans: { some: { assignedCollectorId: user.id } } },
      ];
    }

    const clients = await this.prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        profile: {
          include: {
            assignedCollector: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        _count: { select: { applications: true, clientLoans: true } },
      },
    });

    return clients.map((client) => this.sanitize(client));
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            assignedCollector: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: { loan: true },
        },
        clientLoans: {
          orderBy: { createdAt: 'desc' },
          include: { installments: true },
        },
      },
    });
    if (!user) throw new NotFoundException('Cliente no encontrado.');
    return this.sanitize({
      ...user,
      clientLoans: user.clientLoans.map((loan) => summarizeLoan(loan)),
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('Cliente no encontrado.');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name ?? undefined,
        phone: dto.phone ?? undefined,
        profile: {
          update: {
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            address: dto.address ?? undefined,
            community: dto.community ?? undefined,
            occupation: dto.occupation ?? undefined,
            employer: dto.employer ?? undefined,
            employmentStartDate: dto.employmentStartDate
              ? new Date(dto.employmentStartDate)
              : undefined,
            monthlyIncome: dto.monthlyIncome ?? undefined,
            otherIncome: dto.otherIncome ?? undefined,
          },
        },
      },
      include: { profile: true },
    });

    await this.audit.log(userId, 'UPDATE_PROFILE', 'ClientProfile', updated.profile?.id);
    return this.sanitize(updated);
  }

  async getOne(user: AuthUser, id: string) {
    const client = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            assignedCollector: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: { loan: true, documents: true },
        },
        clientLoans: {
          orderBy: { createdAt: 'desc' },
          include: {
            installments: { orderBy: { number: 'asc' } },
            payments: { orderBy: { paidAt: 'desc' } },
          },
        },
      },
    });

    if (!client) throw new NotFoundException('Cliente no encontrado.');
    if (user.role === 'COLLECTOR') {
      const assigned =
        client.profile?.assignedCollectorId === user.id ||
        client.clientLoans.some((loan) => loan.assignedCollectorId === user.id);
      if (!assigned) {
        throw new ForbiddenException('No tienes acceso a este cliente.');
      }
    }
    return this.sanitize({
      ...client,
      clientLoans: client.clientLoans.map((loan) => summarizeLoan(loan)),
    });
  }

  async assignCollector(user: AuthUser, clientId: string, collectorId?: string | null) {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      include: { profile: true },
    });
    if (!client || client.role !== 'CLIENT') {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (collectorId) {
      const collector = await this.prisma.user.findUnique({ where: { id: collectorId } });
      if (!collector || collector.role !== 'COLLECTOR') {
        throw new NotFoundException('Cobrador no encontrado.');
      }
    }

    const profile = await this.prisma.clientProfile.update({
      where: { userId: clientId },
      data: { assignedCollectorId: collectorId || null },
      include: { assignedCollector: true },
    });

    await this.audit.log(user.id, 'ASSIGN_COLLECTOR', 'ClientProfile', profile.id, {
      collectorId: collectorId || null,
    });
    return profile;
  }

  private sanitize<T extends { passwordHash?: string }>(user: T) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
