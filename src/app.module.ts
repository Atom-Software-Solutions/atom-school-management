import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcademicsModule } from './academics/academics.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailModule } from './email/email.module';
import { GuardiansModule } from './guardians/guardians.module';
import { PrismaService } from './prisma/prisma.service';
import { SchoolsModule } from './schools/schools.module';
import { StudentsModule } from './students/students.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminModule,
    UsersModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    ClassroomsModule,
    AcademicsModule,
    EmailModule,
    GuardiansModule,
    DashboardModule,
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
