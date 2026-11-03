import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setCookie(res, result.token);
    return result.user;
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setCookie(res, result.token);
    return result.user;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jyc_token', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @ApiCookieAuth('jyc_token')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  private setCookie(res: Response, token: string) {
    res.cookie('jyc_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
