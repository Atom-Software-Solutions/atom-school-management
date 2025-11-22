import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomDefinitionsController } from './classroom-definitions.controller';
import { ClassroomOfferingsController } from './classroom-offerings.controller';
import { EnrollmentsController } from './enrollments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [ClassroomsController, ClassroomDefinitionsController, ClassroomOfferingsController, EnrollmentsController],
  providers: [ClassroomsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class ClassroomsModule {}
