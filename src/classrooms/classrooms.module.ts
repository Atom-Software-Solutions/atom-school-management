import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomDefinitionsController } from './classroom-definitions.controller';
import { ClassroomDefinitionsUpdateController } from './classroom-definitions-update.controller';
// Classroom offerings controller removed — functionality replaced by year-scoped classroom definitions
import { EnrollmentsController } from './enrollments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [
    ClassroomDefinitionsController,
    ClassroomDefinitionsUpdateController,
    EnrollmentsController,
  ],
  providers: [ClassroomsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class ClassroomsModule {}
