import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

const cookieExtractor = (request: Request) =>
  request?.cookies?.jyc_token || request?.cookies?.token || null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'jyc-digital-dev-secret',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    name: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Sesión no válida.');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}
