import { Module } from '@nestjs/common';
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
export class AppModule {}
