import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PdfGenerationService } from './pdf-generation.service';
import { ReportCardsService } from './report-cards.service';
import { computeMotEot, parseNumeric, round1, round2 } from './report-utils';
import { ResultsService } from './results.service';

@Controller('schools/:schoolId/results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly reportCardsService: ReportCardsService,
    private readonly pdfGenerationService: PdfGenerationService,
  ) { }

  @Get('by-identity')
  async getStudentResultsByIdentity(
    @Param('schoolId') schoolId: string,
    @Query('identity') identity: string,
    @Query('yearId') yearId: string,
    @Query('termId') termId: string,
    @Req() req: any,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.getStudentResultsByIdentity(
      schoolId,
      req.user.id,
      yearId,
      termId,
      identity,
    );
  }

  @Get('by-classroom')
  async getResultsByClassroom(
    @Param('schoolId') schoolId: string,
    @Query('yearId') yearId: string,
    @Query('termId') termId: string,
    @Query('definitionId') definitionId: string,
    @Req() req: any,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.getResultsByClassroom(
      schoolId,
      req.user.id,
      yearId,
      termId,
      definitionId,
    );
  }

  @Get('report-cards/by-identity')
  async getReportCardByIdentity(
    @Param('schoolId') schoolId: string,
    @Query('identity') identity: string,
    @Query('yearId') yearId: string,
    @Query('termId') termId: string,
    @Req() req: any,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.reportCardsService.getReportCardByIdentity(
      schoolId,
      req.user.id,
      yearId,
      termId,
      identity,
    );
  }

  @Get('report-cards/by-identity/pdf')
  async getReportCardByIdentityPDF(
    @Param('schoolId') schoolId: string,
    @Query('identity') identity: string,
    @Query('yearId') yearId: string,
    @Query('termId') termId: string,
    @Req() req: any,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');

    // Get the report card data
    const reportCardData = await this.reportCardsService.getReportCardByIdentity(
      schoolId,
      req.user.id,
      yearId,
      termId,
      identity,
    );

    // Transform the data to the format expected by PDF generation service
    const pdfData = this.transformReportCardDataToPDF(reportCardData);

    // Generate PDF
    const pdfBuffer = await this.pdfGenerationService.generateReportCardPDF(pdfData);

    // Set response headers for PDF download
    const safeStudentName = reportCardData.student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `report-card-${safeStudentName}.pdf`;

    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
      length: pdfBuffer.length,
    });
  }

  /**
   * Transform report card data from the service to the format expected by PDF generation
   */
  private transformReportCardDataToPDF(reportCardData: any) {
    return {
      school: {
        name: reportCardData.school.name,
        contact: reportCardData.school.contact || '',
        motto: reportCardData.school.motto || '',
      },
      term: {
        name: reportCardData.term.name,
        year: reportCardData.term.year,
        dates: reportCardData.term.dates || '',
      },
      student: {
        name: reportCardData.student.name,
        regNo: reportCardData.student.regNo,
        class: reportCardData.student.class || '',
        stream: reportCardData.student.stream || '',
      },
      subjects: reportCardData.subjects.map((subject: any) => {
        const assessments = Array.isArray(subject.assessments)
          ? subject.assessments.map((a: any) => {
            const parsedScore = parseNumeric(a.score);
            const parsedMax = parseNumeric(a.max_score);
            return {
              type: a.type,
              score: a.type === 'CAT' ? (typeof a.score === 'number' ? a.score : parsedScore) : round1(parsedScore),
              max_score: a.type === 'CAT' ? (typeof a.max_score === 'number' ? a.max_score : parsedMax) : round1(parsedMax),
            };
          })
          : undefined;

        const cat = assessments?.find((a: any) => a.type === 'CAT')?.score ?? round1(parseNumeric(subject.cat));
        const mot = assessments?.find((a: any) => a.type === 'MIDTERM')?.score ?? round1(parseNumeric(subject.mot));
        const eot = assessments?.find((a: any) => a.type === 'END_OF_TERM')?.score ?? round1(parseNumeric(subject.eot));
        const motEot = round1(computeMotEot({ assessments, mot, eot, motEot: subject.motEot })) ?? round1(parseNumeric(subject.motEot));
        const score = typeof subject.score === 'number'
          ? round1(subject.score)
          : (typeof cat === 'number' || typeof motEot === 'number')
            ? Math.round(((cat ?? 0) + (motEot ?? 0)) * 10) / 10
            : round1(parseNumeric(subject.average ?? subject.score));

        return {
          name: subject.name,
          assessments,
          cat,
          mot,
          eot,
          motEot,
          score,
          grade: subject.grade,
          credits: round1(subject.credits),
          remarks: subject.remarks || '',
        };
      }),
      summary: {
        totalMarks: round1(reportCardData.summary.totalMarks || 0) ?? 0,
        totalCredits: round1(reportCardData.summary.totalCredits) ?? undefined,
        average: round1(reportCardData.summary.average) ?? 0,
        gpa: round2(reportCardData.summary.gpa) ?? undefined,
        division: reportCardData.summary.division ?? undefined,
        rank: round1(reportCardData.summary.rank) ?? undefined,
      },
      attendance: reportCardData.attendance,
      conduct: reportCardData.conduct,
      activities: reportCardData.activities,
      comments: {
        teacher: reportCardData.comments?.teacher || '',
        head: reportCardData.comments?.head || '',
      },
      grading: reportCardData.grading || [],
    };
  }
}
