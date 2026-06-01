import { Controller, ForbiddenException, Get, Param, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ReportCard2PdfService } from './report-card-2-pdf.service';
import { ReportCardsService } from './report-cards.service';
import { exampleData2, exampleConfig2 } from './report-card-2.component';

@Controller('schools/:schoolId/report-card-2')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ReportCard2Controller {
    constructor(
        private readonly reportCardsService: ReportCardsService,
        private readonly pdfService: ReportCard2PdfService,
    ) { }

    @Get('by-identity/pdf')
    async getReportCard2ByIdentityPDF(
        @Param('schoolId') schoolId: string,
        @Query('identity') identity: string,
        @Query('yearId') yearId: string,
        @Query('termId') termId: string,
        @Req() req: any,
    ) {
        if (!req.user) {
            throw new ForbiddenException('Authentication required');
        }

        // fetch report card data (reuse existing service)
        const reportCardData = await this.reportCardsService.getReportCardByIdentity(
            schoolId,
            req.user.id,
            yearId,
            termId,
            identity,
        );

        // transform to shape expected by report-card-2.component
        const pdfData = this.transformToReportCard2Data(reportCardData);

        const pdfBuffer = await this.pdfService.generateReportCard2PDF(pdfData);

        const safeStudentName = (reportCardData.student?.name || 'student').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `report-card-2-${safeStudentName}.pdf`;

        return new StreamableFile(pdfBuffer, {
            type: 'application/pdf',
            disposition: `attachment; filename="${fileName}"`,
            length: pdfBuffer.length,
        });
    }

    // New: generate PDF from the component's dummy data for quick testing
    @Get('dummy/pdf')
    async getReportCard2DummyPDF(
        @Param('schoolId') schoolId: string,
        @Req() req: any,
    ) {
        if (!req.user) {
            throw new ForbiddenException('Authentication required');
        }

        const pdfBuffer = await this.pdfService.generateReportCard2PDF(exampleData2, exampleConfig2);

        const fileName = `report-card-2-dummy.pdf`;

        return new StreamableFile(pdfBuffer, {
            type: 'application/pdf',
            disposition: `attachment; filename="${fileName}"`,
            length: pdfBuffer.length,
        });
    }

    private transformToReportCard2Data(reportCardData: any) {
        // preserve components if present, otherwise provide single-entry subject
        const subjects = (reportCardData.subjects || []).map((s: any) => {
            if (Array.isArray(s.components) && s.components.length > 0) {
                // keep components, ensure numeric rounding where appropriate
                const comps = s.components.map((c: any) => ({
                    name: c.name,
                    score: typeof c.score === 'number' ? Math.round(c.score * 10) / 10 : c.score,
                    grade: c.grade,
                    credits: typeof c.credits === 'number' ? Math.round(c.credits * 10) / 10 : c.credits,
                    remarks: c.remarks || '',
                }));
                return { name: s.name, components: comps };
            }
            return {
                name: s.name,
                score: typeof s.score === 'number' ? Math.round(s.score * 10) / 10 : s.score,
                grade: s.grade,
                credits: typeof s.credits === 'number' ? Math.round(s.credits * 10) / 10 : s.credits,
                remarks: s.remarks || '',
            };
        });

        return {
            school: {
                name: reportCardData.school?.name || '',
                contact: reportCardData.school?.contact || '',
                motto: reportCardData.school?.motto || '',
            },
            term: {
                name: reportCardData.term?.name || '',
                year: reportCardData.term?.year || '',
                dates: reportCardData.term?.dates || '',
            },
            student: {
                name: reportCardData.student?.name || '',
                regNo: reportCardData.student?.regNo || '',
                class: reportCardData.student?.class || '',
                stream: reportCardData.student?.stream || '',
            },
            subjects,
            summary: {
                totalMarks: typeof reportCardData.summary?.totalMarks === 'number' ? Math.round(reportCardData.summary.totalMarks * 10) / 10 : reportCardData.summary?.totalMarks || 0,
                totalCredits: typeof reportCardData.summary?.totalCredits === 'number' ? Math.round(reportCardData.summary.totalCredits * 10) / 10 : reportCardData.summary?.totalCredits,
                average: typeof reportCardData.summary?.average === 'number' ? Math.round(reportCardData.summary.average * 10) / 10 : reportCardData.summary?.average || 0,
                gpa: typeof reportCardData.summary?.gpa === 'number' ? Math.round(reportCardData.summary.gpa * 100) / 100 : reportCardData.summary?.gpa,
                division: reportCardData.summary?.division,
                rank: reportCardData.summary?.rank,
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