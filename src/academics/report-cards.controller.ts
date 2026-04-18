import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  Response,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ResultsService } from './results.service';
import { PdfGenerationService } from './pdf-generation.service';
import { GenerateReportCardDto } from './dto/generate-report-card.dto';
import { DownloadReportCardDto } from './dto/download-report-card.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import type { Response as ExpressResponse } from 'express';

@Controller('schools/:schoolId/report-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ReportCardsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly pdfGenerationService: PdfGenerationService,
  ) {}

  @Post()
  generate(
    @Param('schoolId') schoolId: string,
    @Body() dto: GenerateReportCardDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.generateReportCard(schoolId, req.user.id, dto);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.getReportCard(id, req.user.id);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.publishReportCard(id, req.user.id);
  }

  @Get(':id/pdf')
  async downloadPDF(
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Response() res: ExpressResponse,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get report card to verify it exists and user has access
    const reportCard = await this.resultsService.getReportCard(id, req.user.id);

    if (!reportCard) {
      throw new NotFoundException('Report card not found');
    }

    if (reportCard.school_id !== schoolId) {
      throw new ForbiddenException(
        'Report card does not belong to this school',
      );
    }

    await this.sendReportCardPdf(reportCard, res);
  }

  @Post('download')
  async downloadGeneratedReportCard(
    @Param('schoolId') schoolId: string,
    @Body() dto: DownloadReportCardDto,
    @Request() req: AuthenticatedRequest,
    @Response() res: ExpressResponse,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }

    const dtoPayload = new GenerateReportCardDto();
    dtoPayload.studentId = dto.studentId;
    dtoPayload.academicYearId = dto.academicYearId;
    dtoPayload.termTemplateItemId = dto.termTemplateItemId;
    dtoPayload.includeRank = true;
    dtoPayload.autoPublish = false;

    const result = await this.resultsService.generateReportCard(schoolId, req.user.id, dtoPayload);

    const reportCard = result.reportCards?.[0];
    if (!reportCard) {
      throw new NotFoundException('Failed to generate report card for download');
    }

    await this.sendReportCardPdf(reportCard, res);
  }

  private async sendReportCardPdf(
    reportCard: any,
    res: ExpressResponse,
  ) {
    try {
      const summary = reportCard.summary;
      if (!summary) {
        throw new BadRequestException('Unable to generate PDF without report card summary');
      }

      const studentName =
        reportCard.student?.first_name && reportCard.student?.last_name
          ? `${reportCard.student.first_name} ${reportCard.student.last_name}`
          : 'report';
      const schoolName = reportCard.school?.name || 'School Report';

      const pdfData = {
        schoolName,
        studentName,
        studentNumber: reportCard.student?.student_no || 'N/A',
        academicYear: summary.academicYear?.name || 'N/A',
        term: summary.term?.name || 'N/A',
        termOrdinal: summary.term?.ordinal || 1,
        overallAverage: summary.overallAverage,
        overallLetterGrade: summary.overallLetterGrade,
        totalSubjects: summary.totalSubjects,
        rank: reportCard.rank ?? null,
        totalStudents: reportCard.total_students ?? null,
        remarks: reportCard.remarks ?? null,
        subjects: summary.subjects.map((s: any) => ({
          name: s.subject?.name || s.name,
          code: s.subject?.code || s.code || '',
          average: s.average,
          letterGrade: s.letterGrade,
          assessments: s.assessments,
        })),
        generatedDate: reportCard.generated_at ? new Date(reportCard.generated_at) : new Date(),
        publishedDate: reportCard.published_at ? new Date(reportCard.published_at) : null,
        status: reportCard.status,
      };

      const pdfBuffer = await this.pdfGenerationService.generateReportCardPDF(pdfData);
      const safeStudentName = studentName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `report-card-${safeStudentName}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
