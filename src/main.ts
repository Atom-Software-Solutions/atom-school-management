import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcrypt';

async function ensureSuperAdmin(prisma: PrismaService) {
  // Check if SUPER_ADMIN exists
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (superAdmin) {
    console.log('✅ SUPER_ADMIN user already exists');
    return;
  }

  // Get environment variables for SUPER_ADMIN
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';
  const phone = process.env.SUPER_ADMIN_PHONE || null;

  // Validate required environment variables
  if (!email || !password) {
    console.warn('⚠️  SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required to create super admin');
    console.warn('   Skipping SUPER_ADMIN creation. Please set these in your .env file.');
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the SUPER_ADMIN user
  try {
    const createdUser = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role: 'SUPER_ADMIN',
        phone,
        is_active: true,
        email_verified: true, // Super admin doesn't need email verification
      },
    });

    console.log(`✅ SUPER_ADMIN user created successfully: ${createdUser.email}`);
  } catch (error) {
    console.error('❌ Failed to create SUPER_ADMIN user:', error);
    throw error;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get PrismaService to initialize SUPER_ADMIN
  const prismaService = app.get(PrismaService);
  
  // Ensure PrismaService is connected before checking for SUPER_ADMIN
  await prismaService.$connect();
  await ensureSuperAdmin(prismaService);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS based on env configuration
  const corsOriginSetting = process.env.CORS_ORIGIN?.trim() ?? '*';
  const allowAllOrigins =
    corsOriginSetting === '*' || corsOriginSetting.toLowerCase() === 'true';
  const allowedOrigins = allowAllOrigins
    ? []
    : corsOriginSetting
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

  if (allowAllOrigins) {
    app.enableCors({
      origin: true, // reflect the request origin
      credentials: true,
    });
  } else {
    app.enableCors({
      credentials: true,
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
    });
  }

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Atom School Management API')
    .setDescription('API documentation for Atom School Management System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('schools', 'School management endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('students', 'Student management endpoints')
    .addTag('classrooms', 'Classroom management endpoints')
    .addTag('academics', 'Academic management endpoints')
    .addTag('email', 'Email service endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // This will persist the JWT token in the browser
    },
  });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
