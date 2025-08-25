/**
 * Ponto de entrada da aplicação Kanban API
 * Configura middleware global, validação e documentação Swagger
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS para comunicação com frontend
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://nawa-kanban.vercel.app', 'https://nawa-kanban-*.vercel.app']
      : ['http://localhost:4200', 'http://localhost:4201'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validação automática de DTOs em todas as rotas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Remove propriedades não definidas nos DTOs
      forbidNonWhitelisted: true,  // Rejeita requests com propriedades extras
      transform: true,        // Auto-transforma tipos (string -> number, etc)
    }),
  );

  // Configuração da documentação Swagger
  const config = new DocumentBuilder()
    .setTitle('Kanban API')
    .setDescription('Task Management System API')
    .setVersion('1.0')
    .addBearerAuth()        // Suporte para JWT Bearer Token
    .addTag('auth', 'Authentication endpoints')
    .addTag('tasks', 'Task management')
    .addTag('users', 'User management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);  // Disponível em /api/docs

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();