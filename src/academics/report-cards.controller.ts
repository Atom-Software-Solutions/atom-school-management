import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Response,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { DownloadReportCardDto } from './dto/download-report-card.dto';
import { GenerateReportCardDto } from './dto/generate-report-card.dto';
import { PdfGenerationService } from './pdf-generation.service';
import { ReportCard2DataService } from './report-card-2-data.service';
import { ReportCard2PdfService } from './report-card-2-pdf.service';
import { ReportCardsService } from './report-cards.service';
import { ResultsService } from './results.service';

@Controller('schools/:schoolId/report-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ReportCardsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly pdfGenerationService: PdfGenerationService,
    private readonly reportCardsService: ReportCardsService,
    private readonly reportCard2DataService: ReportCard2DataService,
    private readonly reportCard2PdfService: ReportCard2PdfService,
  ) { }

  @Post()
  generate(
    @Param('schoolId') schoolId: string,
    @Body() dto: GenerateReportCardDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.generateReportCard(schoolId, req.user.id, dto);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.getReportCard(id, req.user.id);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.publishReportCard(id, req.user.id);
  }

  @Get(':id/pdf')
  async downloadPDF(
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Response() res: ExpressResponse,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');

    // Get report card to verify it exists and user has access
    const reportCard = await this.resultsService.getReportCard(id, req.user.id);

    if (!reportCard) throw new ForbiddenException('Report card not found');

    if (reportCard.school_id !== schoolId) throw new ForbiddenException('Report card does not belong to this school');

    await this.sendReportCardPdf(reportCard, res);
  }

  @Post('download')
  async downloadGeneratedReportCard(
    @Param('schoolId') schoolId: string,
    @Body() dto: DownloadReportCardDto,
    @Request() req: AuthenticatedRequest,
    @Response() res: ExpressResponse,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');

    const dtoPayload = new GenerateReportCardDto();
    dtoPayload.studentId = dto.studentId;
    dtoPayload.academicYearId = dto.academicYearId;
    dtoPayload.termTemplateItemId = dto.termTemplateItemId;
    dtoPayload.includeRank = true;
    dtoPayload.autoPublish = false;

    const result = await this.resultsService.generateReportCard(schoolId, req.user.id, dtoPayload);

    const reportCard = result.reportCards?.[0];
    if (!reportCard) throw new ForbiddenException('Failed to generate report card for download');

    await this.sendReportCardPdf(reportCard, res);
  }

  // New combined endpoint: pick O-Level vs A-Level based on enrollment.classroom_definition.level
  @Get('by-identity/auto/pdf')
  async downloadReportCardAutoByIdentity(
    @Param('schoolId') schoolId: string,
    @Query('identity') identity: string,
    @Query('yearId') yearId: string,
    @Query('termId') termId: string,
    @Request() req: any,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');

    // determine enrollment level
    const level = await this.reportCardsService.getEnrollmentLevelByIdentity(
      schoolId,
      req.user.id,
      yearId,
      identity,
    );

    console.log(`Determined enrollment level for identity ${identity}: ${level}`);

    if (level === 'O-Level') {
      // O-Level: use existing ReportCardsService + PdfGenerationService
      const reportCardData = await this.reportCardsService.getReportCardByIdentity(
        schoolId,
        req.user.id,
        yearId,
        termId,
        identity,
      );
      const pdfData = this.transformReportCardDataToPDF(reportCardData);
      const pdfBuffer = await this.pdfGenerationService.generateReportCardPDF(pdfData);

      const safeStudentName = (reportCardData.student?.name || 'student').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `report-card-${safeStudentName}.pdf`;
      return new StreamableFile(pdfBuffer, {
        type: 'application/pdf',
        disposition: `attachment; filename="${fileName}"`,
        length: pdfBuffer.length,
      });
    } else {
      // A-Level: use ReportCard2 pipeline
      const pdfData = await this.reportCard2DataService.buildReportCard2Data(
        schoolId,
        identity,
        yearId,
        termId,
        req,
      );
      const pdfBuffer = await this.reportCard2PdfService.generateReportCard2PDF(pdfData);

      const safeStudentName = (pdfData.student?.name || 'student').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `report-card-2-${safeStudentName}.pdf`;
      return new StreamableFile(pdfBuffer, {
        type: 'application/pdf',
        disposition: `attachment; filename="${fileName}"`,
        length: pdfBuffer.length,
      });
    }
  }

  private transformReportCardDataToPDF(reportCardData: any) {
    // Helper to round to 1 decimal place if value is a number
    const round1 = (val: any) =>
      typeof val === "number" ? Math.round(val * 10) / 10 : val;

    // Helper to round to 2 decimal places if value is a number
    const round2 = (val: any) =>
      typeof val === "number" ? Math.round(val * 100) / 100 : val;

    const studentName =
      reportCardData.student?.name ||
      (reportCardData.student?.first_name && reportCardData.student?.last_name
        ? `${reportCardData.student.first_name} ${reportCardData.student.last_name}`
        : 'student');

    const term = reportCardData.term || {};
    const school = reportCardData.school || {};

    const subjectsSource = reportCardData.subjects || reportCardData.summary?.subjects || [];

    const subjects = (subjectsSource || []).map((s: any) => ({
      name: s.subject?.name || s.name || 'Unknown',
      score: round1(s.score ?? s.average ?? 0),
      grade: s.grade ?? s.letterGrade ?? '',
      credits: round1(s.credits ?? 0),
      remarks: s.remarks ?? '',
    }));

    const summary = reportCardData.summary || {
      totalMarks: 0,
      totalCredits: 0,
      average: 0,
      gpa: 0,
      division: '',
      rank: 0,
      grading: reportCardData.grading || [],
    };

    return {
      school: {
        name: school.name || 'School',
        contact: school.contact || '',
        motto: school.motto || '',
      },
      term: {
        name: term.name || '',
        year: term.year || '',
        dates: term.dates || '',
      },
      student: {
        name: studentName,
        regNo: reportCardData.student?.regNo || reportCardData.student?.student_no || '',
        class: reportCardData.student?.class || '',
        stream: reportCardData.student?.stream || '',
      },
      subjects,
      summary: {
        totalMarks: round1(summary.totalMarks ?? 0),
        totalCredits: round1(summary.totalCredits ?? 0),
        average: round1(summary.average ?? 0),
        gpa: round2(summary.gpa ?? 0),
        division: summary.division ?? '',
        rank: round1(summary.rank ?? 0),
      },
      attendance: reportCardData.attendance || {},
      conduct: reportCardData.conduct || '',
      activities: reportCardData.activities || '',
      comments: {
        teacher: reportCardData.comments?.teacher ?? reportCardData.remarks ?? '',
        head: reportCardData.comments?.head ?? reportCardData.head_remarks ?? '',
      },
      grading: summary.grading || reportCardData.grading || [],
    };
  }

  private async sendReportCardPdf(
    reportCard: any,
    res: ExpressResponse,
  ) {
    try {
      const summary = reportCard.summary;
      // Allow top-level subjects when summary.subjects missing
      const subjectsSource = summary?.subjects || reportCard.subjects || [];

      if (!summary && !reportCard.subjects) {
        throw new ForbiddenException('Unable to generate PDF without report card summary or subjects');
      }

      const studentName =
        reportCard.student?.name ||
        (reportCard.student?.first_name && reportCard.student?.last_name
          ? `${reportCard.student.first_name} ${reportCard.student.last_name}`
          : 'student');
      const schoolName = reportCard.school?.name || 'School Report';

      const subjects = (subjectsSource || []).map((s: any) => ({
        name: s.subject?.name || s.name || 'Unknown',
        score: typeof s.score === 'number' ? Math.round(s.score * 10) / 10 : s.average ?? 0,
        grade: s.grade ?? s.letterGrade ?? '',
        credits: typeof s.credits === 'number' ? Math.round(s.credits * 10) / 10 : s.credits ?? 0,
        remarks: s.remarks || '',
      }));

      const pdfData = {
        school: {
          name: schoolName,
          contact: reportCard.school?.contact || '',
          motto: reportCard.school?.motto || '',
        },
        term: {
          name: summary?.term?.name || reportCard.term?.name || '',
          year: summary?.academicYear?.name || reportCard.term?.year || '',
          dates: summary?.term?.dates || reportCard.term?.dates || '',
        },
        student: {
          name: studentName,
          regNo: reportCard.student?.student_no || reportCard.student?.regNo || '',
          class: reportCard.student?.class?.name || reportCard.student?.class || '',
          stream: reportCard.student?.stream?.name || reportCard.student?.stream || '',
        },
        subjects,
        summary: {
          totalMarks: summary?.totalMarks ?? reportCard.totalMarks ?? 0,
          totalCredits: summary?.totalCredits ?? reportCard.totalCredits ?? 0,
          average: summary?.overallAverage ?? reportCard.overallAverage ?? 0,
          gpa: summary?.gpa ?? reportCard.gpa ?? 0,
          division: summary?.division ?? reportCard.division ?? '',
          rank: reportCard.rank ?? summary?.rank ?? 0,
        },
        attendance: reportCard.attendance || {},
        conduct: reportCard.conduct || '',
        activities: reportCard.activities || '',
        comments: {
          teacher: reportCard.remarks || reportCard.comments?.teacher || '',
          head: reportCard.head_remarks || reportCard.comments?.head || '',
        },
        grading: summary?.grading || reportCard.grading || [],
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
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(
        `Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
