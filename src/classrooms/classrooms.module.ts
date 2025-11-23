import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomDefinitionsController } from './classroom-definitions.controller';
import { ClassroomDefinitionsUpdateController } from './classroom-definitions-update.controller';
import { ClassroomOfferingsController } from './classroom-offerings.controller';
import { ClassroomOfferingsUpdateController } from './classroom-offerings-update.controller';
import { EnrollmentsController } from './enrollments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [
    ClassroomDefinitionsController,
    ClassroomDefinitionsUpdateController,
    ClassroomOfferingsController,
    ClassroomOfferingsUpdateController,
    EnrollmentsController,
  ],
  providers: [ClassroomsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class ClassroomsModule {}
