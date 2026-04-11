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
import { PdfStorageService } from './pdf-storage.service';
import { GenerateReportCardDto } from './dto/generate-report-card.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import type { Response as ExpressResponse } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('schools/:schoolId/report-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ReportCardsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly pdfStorageService: PdfStorageService,
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

    if (!reportCard.pdf_url) {
      throw new BadRequestException(
        'PDF has not been generated for this report card',
      );
    }

    try {
      // Construct file path from pdf_url
      // pdf_url is in format: /pdfs/reports/reportcard-*.pdf
      // Extract the relative path
      const urlPath = reportCard.pdf_url.replace(/^\/pdfs\//, '');
      const baseStoragePath = process.env.PDF_STORAGE_PATH || './pdfs';
      const filePath = path.join(baseStoragePath, urlPath);

      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('PDF file not found on disk');
      }

      // Read and send file
      const fileContent = fs.readFileSync(filePath);
      const studentName =
        reportCard.student?.first_name && reportCard.student?.last_name
          ? `${reportCard.student.first_name}_${reportCard.student.last_name}`
          : 'report';
      const fileName = `report-card-${studentName}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );
      res.setHeader('Content-Length', fileContent.length);

      res.send(fileContent);
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
