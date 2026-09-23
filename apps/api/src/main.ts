import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { API_DOCS_PATH, API_PREFIX } from '@forestwatch/config';
import { AppModule } from './app.module';
import { getEnv } from './env';
import { isAllowedCorsOrigin } from './http/allowed-origins';

async function bootstrap(): Promise<void> {
  const env = getEnv();
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix(env.API_PREFIX.replace(/^\//, ''));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      callback(
        null,
        isAllowedCorsOrigin(origin, {
          webOrigin: env.WEB_ORIGIN,
          nodeEnv: env.NODE_ENV,
          vercel: process.env.VERCEL === '1',
        }),
      );
    },
    credentials: true,
  });

  if (env.STORAGE_PROVIDER === 'local') {
    const root =
      process.env.VERCEL === '1' ? path.join('/tmp', 'forestwatch-uploads') : path.resolve(env.STORAGE_LOCAL_ROOT);
    mkdirSync(root, { recursive: true });
    app.use(`${API_PREFIX}/files`, express.static(root));
  }

  const swagger = new DocumentBuilder()
    .setTitle('ForestWatch Sri Lanka API')
    .setDescription(
      'Central REST API for plantation monitoring. Health, authentication, locations, campaigns, species, plantations, images, map queries, monitoring updates, and comments are live.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(API_DOCS_PATH.replace(/^\//, ''), app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT) || env.API_PORT;
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}${env.API_PREFIX}/health`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
