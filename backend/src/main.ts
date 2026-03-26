/**
 * Ponto de entrada da aplicação Kanban API
 * Configura middleware global, validação e documentação Swagger
 */
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Habilita CORS para comunicação com frontend (incluindo portas Vite 5173-5177)
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? [
          'https://iakanba.oqay.pro',
          'https://kanban-oqay-git-main-lucas-projects-5fb33266.vercel.app',
          'https://kanban-oqay-c78fnebgu-lucas-projects-5fb33266.vercel.app',
          /https:\/\/.*\.vercel\.app$/
        ]
      : [
          'http://localhost:4200',
          'http://localhost:4201',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          'http://localhost:5176',
          'http://localhost:5177',
          'http://localhost:7173',
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Interceptor global para serialização — exclui campos @Exclude() (ex: passwordHash)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Validação automática de DTOs em todas as rotas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Remove propriedades não definidas nos DTOs
      forbidNonWhitelisted: true,  // Rejeita requests com propriedades extras
      transform: true,        // Auto-transforma tipos (string -> number, etc)
    }),
  );

  // Swagger apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Kanban API')
      .setDescription('Task Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('tasks', 'Task management')
      .addTag('users', 'User management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();