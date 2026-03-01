import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AcademicsService } from './academics.service';
import { ResultsService } from './results.service';
import { TermTemplatesController } from './term-templates.controller';
import { TermTemplatesLockController } from './term-templates-lock.controller';
import { YearsController } from './years.controller';
import { SubjectsController } from './subjects.controller';
import { AssessmentsController } from './assessments.controller';
import { GradesController } from './grades.controller';
import { StudentResultsController } from './student-results.controller';
import { ReportCardsController } from './report-cards.controller';
import { StudentReportCardsController } from './student-report-cards.controller';
import { SchoolStructureController } from './school-structure.controller';

@Module({
  controllers: [
    TermTemplatesController,
    TermTemplatesLockController,
    YearsController,
    SubjectsController,
    AssessmentsController,
    GradesController,
    StudentResultsController,
    ReportCardsController,
    StudentReportCardsController,
    SchoolStructureController,
  ],
  providers: [AcademicsService, ResultsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class AcademicsModule {}
