import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SchoolsModule } from '../schools/schools.module';
import { StudentsModule } from '../students/students.module';
import { AcademicsService } from './academics.service';
import { AssessmentsController } from './assessments.controller';
import { GradesController } from './grades.controller';
import { PdfGenerationService } from './pdf-generation.service';
import { ReportCard2PdfService } from './report-card-2-pdf.service';
import { ReportCard2Controller } from './report-card-2.controller';
import { ReportCardsController } from './report-cards.controller';
import { ReportCardsService } from './report-cards.service';
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
  imports: [SchoolsModule, StudentsModule],
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
    ReportCard2Controller,
  ],
  providers: [
    AcademicsService,
    ResultsService,
    JwtAuthGuard,
    RolesGuard,
    PdfGenerationService,
    ReportCardsService,
    ReportCard2PdfService,
  ],
  exports: [
    ReportCard2PdfService,
  ],
})
export class AcademicsModule { }
