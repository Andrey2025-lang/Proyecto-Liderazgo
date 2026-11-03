import 'dotenv/config';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || ['cambia-esta-clave-en-produccion', 'jyc-digital-dev-secret'].includes(process.env.JWT_SECRET))) {
    throw new Error('Configurá JWT_SECRET con una clave privada aleatoria de al menos 32 caracteres.');
  }
  mkdirSync(process.env.UPLOAD_DIR || './uploads', { recursive: true });

  const app = await NestFactory.create(AppModule);
  if (process.env.NODE_ENV === 'production') app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  const frontend = resolve(__dirname, '../../client/dist');
  if (existsSync(resolve(frontend, 'index.html'))) {
    app.use(express.static(frontend, { index: false }));
    app.use((request: express.Request, response: express.Response, next: express.NextFunction) => {
      if (request.method === 'GET' && request.path !== '/api' && !request.path.startsWith('/api/') && !extname(request.path) && request.accepts('html')) {
        return response.sendFile(resolve(frontend, 'index.html'));
      }
      next();
    });
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('Falta client/dist/index.html. Ejecutá npm run render:build antes de iniciar.');
  }
  app.enableCors({
    origin: (
      process.env.CLIENT_ORIGIN || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173,http://127.0.0.1:5173'
    )
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalInterceptors(new SanitizeInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('JyC Digital API')
    .setDescription(
      'API para la gestión de solicitudes, préstamos y pagos de JyC Préstamos.',
    )
    .setVersion('1.0')
    .addCookieAuth('jyc_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`JyC Digital API en http://localhost:${port}/api`);
  console.log(`Swagger en http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('No se pudo iniciar JyC Digital:', error.message);
  process.exit(1);
});
