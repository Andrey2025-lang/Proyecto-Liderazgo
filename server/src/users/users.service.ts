import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      include: {
        profile: true,
        _count: { select: { clientLoans: true, applications: true } },
      },
    });
    return users.map((user) => this.sanitize(user));
  }

  async listCollectors() {
    return this.prisma.user.findMany({
      where: { role: 'COLLECTOR', status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        _count: { select: { assignedClients: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUserDto, actorId: string) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role,
      },
    });

    await this.audit.log(actorId, 'CREATE_USER', 'User', user.id, {
      role: user.role,
    });
    return this.sanitize(user);
  }

  async updateStatus(id: string, status: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (user.id === actorId && status === 'INACTIVE') {
      throw new BadRequestException('No puedes desactivar tu propia cuenta.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
    });
    await this.audit.log(actorId, 'UPDATE_USER_STATUS', 'User', id, { status });
    return this.sanitize(updated);
  }

  private sanitize<T extends { passwordHash?: string }>(user: T) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
