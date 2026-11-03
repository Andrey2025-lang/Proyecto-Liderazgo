import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';

async function bootstrap() {
  mkdirSync(process.env.UPLOAD_DIR || './uploads', { recursive: true });

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: (
      process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173'
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
  await app.listen(port);
  console.log(`JyC Digital API en http://localhost:${port}/api`);
  console.log(`Swagger en http://localhost:${port}/api/docs`);
}

bootstrap();
