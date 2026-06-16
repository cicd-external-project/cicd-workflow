import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // FlowCI's Render deploy lane health-checks at /api/v1/health by default
  // (see render-deploy.yml `healthcheck-path` input) — the global prefix
  // keeps every route, including health, under that namespace.
  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
