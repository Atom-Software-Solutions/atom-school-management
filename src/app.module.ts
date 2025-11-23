import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { StudentsModule } from './students/students.module';
import { EmailModule } from './email/email.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { PrismaService } from './prisma/prisma.service';
import { AcademicsModule } from './academics/academics.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    ClassroomsModule,
    AcademicsModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes
    // It will safely handle cases where user is not authenticated
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
