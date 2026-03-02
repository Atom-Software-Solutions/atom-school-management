import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicsService } from './academics.service';
import { AssessmentsController } from './assessments.controller';
import { GradesController } from './grades.controller';
import { ReportCardsController } from './report-cards.controller';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { SchoolStructureController } from './school-structure.controller';
import { StudentReportCardsController } from './student-report-cards.controller';
import { StudentResultsController } from './student-results.controller';
import { SubjectsController } from './subjects.controller';
import { TermTemplatesLockController } from './term-templates-lock.controller';
import { TermTemplatesController } from './term-templates.controller';
import { YearsController } from './years.controller';

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
    ResultsController,
  ],
  providers: [AcademicsService, ResultsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class AcademicsModule { }
