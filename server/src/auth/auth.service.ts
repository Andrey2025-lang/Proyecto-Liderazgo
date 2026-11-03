import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.acceptPrivacy) {
      throw new BadRequestException('Debes aceptar la política de privacidad.');
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException('Ya existe una cuenta con ese correo.');
    }

    const existingCedula = await this.prisma.clientProfile.findUnique({
      where: { cedula: dto.cedula },
    });
    if (existingCedula) {
      throw new ConflictException('Ya existe una cuenta con esa cédula.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone,
        passwordHash,
        role: 'CLIENT',
        profile: {
          create: { cedula: dto.cedula, community: dto.community, occupation: dto.occupation },
        },
        consents: {
          create: [
            {
              type: 'PRIVACY',
              version: '2026-10',
            },
            ...(dto.acceptEquifax
              ? [{ type: 'EQUIFAX', version: '2026-10' }]
              : []),
          ],
        },
      },
      include: { profile: true },
    });

    await this.audit.log(user.id, 'REGISTER', 'User', user.id, {
      role: user.role,
    });

    const token = await this.signToken(user);
    return { token, user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { profile: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    await this.audit.log(user.id, 'LOGIN', 'User', user.id);
    const token = await this.signToken(user);
    return { token, user: this.sanitize(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Sesión no válida.');
    }

    return this.sanitize(user);
  }

  async signToken(user: { id: string; email: string; role: string; name: string }) {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
  }

  sanitize<T extends { passwordHash?: string }>(user: T) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
