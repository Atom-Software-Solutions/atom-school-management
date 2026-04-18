import { Injectable, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

type PDFDocumentInstance = InstanceType<typeof PDFDocument>;

interface ReportCardPDFData {
  schoolName: string;
  studentName: string;
  studentNumber: string;
  academicYear: string;
  term: string;
  termOrdinal: number;
  overallAverage: number;
  overallLetterGrade: string | null;
  totalSubjects: number;
  rank?: number | null;
  totalStudents?: number | null;
  remarks?: string | null;
  subjects: Array<{
    name: string;
    code: string;
    average: number;
    letterGrade: string | null;
    assessments?: Array<{
      name: string;
      code?: string;
      type: string;
      score: number;
      percentage: number;
      maxScore: number;
    }>;
  }>;
  generatedDate: Date;
  publishedDate?: Date | null;
  status: 'draft' | 'published' | 'archived';
}

@Injectable()
export class PdfGenerationService {
  private readonly pdfStoragePath = process.env.PDF_STORAGE_PATH || './pdfs';

  /**
   * Generate a PDF report card and return as a Buffer
   */
  async generateReportCardPDF(data: ReportCardPDFData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      try {
        this.renderReportCardContent(doc, data);
        doc.end();
      } catch (error) {
        doc.end();
        reject(error);
      }
    });
  }

  /**
   * Save PDF to file system and return the file path
   */
  async savePDFToFile(
    pdfBuffer: Buffer,
    fileName: string,
    subDirectory: string = 'reports',
  ): Promise<string> {
    const dirPath = path.join(this.pdfStoragePath, subDirectory);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    return filePath;
  }

  /**
   * Get PDF file URL (for serving)
   */
  getPDFUrl(filePath: string): string {
    // Returns a relative path that can be served via an API endpoint
    const relativePath = path.relative(this.pdfStoragePath, filePath);
    return `/api/pdfs/${relativePath.replace(/\\/g, '/')}`;
  }

  /**
   * Load PDF from file system
   */
  async loadPDFFromFile(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`PDF file not found: ${filePath}`);
    }
    return fs.promises.readFile(filePath);
  }

  /**
   * Delete PDF file
   */
  async deletePDFFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.promises.unlink(filePath);
    }
  }

  /**
   * Render the report card content into the PDF
   */
  private renderReportCardContent(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    // Header with school info
    this.renderSchoolHeader(doc, data);

    // Student Information Section (compact)
    this.renderStudentInfoCompact(doc, data);

    // Subject Performance Table (with assessments)
    this.renderDetailedSubjectsTable(doc, data);

    // Total Points
    this.renderTotalPoints(doc, data);

    // Grading Scale
    this.renderGradingScale(doc, data);

    // Class Teacher's Comment Section
    this.renderTeacherCommentSection(doc, data);

    // Footer with school stamp area and disclaimer
    this.renderReportFooter(doc, data);
  }

  /**
   * Render school header with logo, name, and contact info
   */
  private renderSchoolHeader(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    const pageWidth = doc.page.width;
    const margin = 40;

    // School name (centered, bold, larger)
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(data.schoolName, 0, 40, {
        align: 'center',
        width: pageWidth,
      });

    // Report type (centered)
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('A\'LEVEL TERMLY REPORT TERM 3 2025', 0, doc.y + 2, {
        align: 'center',
        width: pageWidth,
      });

    // Contact info (centered, smaller)
    doc
      .fontSize(8)
      .font('Helvetica')
      .text('P.O BOX 336 Lugazi, Tel: 0778429441', 0, doc.y, {
        align: 'center',
        width: pageWidth,
      });

    doc
      .fontSize(8)
      .text('4km Lugazi-luuka Road', 0, doc.y, {
        align: 'center',
        width: pageWidth,
      });

    doc
      .fontSize(8)
      .text('www.stmarycollegelugazi.ug | info@stmarycollegelugazi.com', 0, doc.y, {
        align: 'center',
        width: pageWidth,
      });

    // Horizontal line
    doc
      .moveTo(margin, doc.y + 6)
      .lineTo(pageWidth - margin, doc.y + 6)
      .stroke();

    doc.y += 15;
  }

  /**
   * Render compact student information
   */
  private renderStudentInfoCompact(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    const margin = 40;
    const pageWidth = doc.page.width;
    const colWidth = (pageWidth - 2 * margin) / 2;

    doc.fontSize(9).font('Helvetica');

    const startY = doc.y;

    // Left column: Name, Class
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Name:', margin, startY);
    doc
      .font('Helvetica')
      .text(data.studentName, margin + 60, startY);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Class:', margin, startY + 15);
    doc
      .font('Helvetica')
      .text('5.5 Sciences', margin + 60, startY + 15);

    // Right column: Academic Year, Pay Code
    const rightColX = margin + colWidth;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Year:', rightColX, startY);
    doc
      .font('Helvetica')
      .text(data.academicYear, rightColX + 60, startY);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('PAY CODE:', rightColX, startY + 15);
    doc
      .font('Helvetica')
      .text('1009176268', rightColX + 60, startY + 15);

    doc.y = startY + 35;
  }

  /**
   * Render detailed subjects table with papers/assessments
   */
  private renderDetailedSubjectsTable(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    const margin = 40;
    const pageWidth = doc.page.width;
    const tableWidth = pageWidth - 2 * margin;

    // Table header
    const headerY = doc.y;
    const colSubject = margin;
    const colPaper = margin + 100;
    const colSet1 = margin + 150;
    const colPaperGrade = margin + 200;
    const colGrade = margin + 260;
    const colComment = margin + 320;
    const colInitial = pageWidth - margin - 50;

    // Header line
    doc
      .moveTo(margin, headerY)
      .lineTo(pageWidth - margin, headerY)
      .stroke();

    // Header text
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('SUBJECT', colSubject, headerY + 4)
      .text('Paper', colPaper, headerY + 4)
      .text('SET 1', colSet1, headerY + 4)
      .text('PAPER', colPaperGrade, headerY + 4)
      .text('GRADE', colGrade, headerY + 4)
      .text('COMMENT', colComment, headerY + 4)
      .text('INITIAL', colInitial, headerY + 4);

    // Secondary header line (GRADE under PAPER column)
    doc
      .fontSize(7)
      .font('Helvetica')
      .text('GRADE', colPaperGrade + 5, headerY + 14);

    // Separator line
    doc
      .moveTo(margin, headerY + 24)
      .lineTo(pageWidth - margin, headerY + 24)
      .stroke();

    // Table rows
    let rowY = headerY + 28;
    const rowHeight = 16;

    data.subjects.forEach((subject) => {
      // Subject row
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(subject.name, colSubject, rowY, { width: 95 });

      // Papers/Assessments
      if (subject.assessments && subject.assessments.length > 0) {
        subject.assessments.forEach((assessment, idx) => {
          const assessmentY = rowY + idx * 10;

          doc
            .fontSize(7)
            .text(assessment.code || '', colPaper, assessmentY)
            .text(assessment.score?.toString() || '', colSet1, assessmentY);

          if (idx === 0) {
            // Main grade columns for first assessment
            doc
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(assessment.percentage?.toFixed(0) || '', colPaperGrade, rowY)
              .text(subject.letterGrade || '-', colGrade, rowY)
              .font('Helvetica')
              .text(data.remarks || '', colComment, rowY, { width: 60 })
              .text('', colInitial, rowY);
          }
        });

        rowY += Math.max(subject.assessments.length, 1) * 10;
      } else {
        // No assessments, just subject row
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(subject.average?.toFixed(2) || '', colPaperGrade, rowY)
          .text(subject.letterGrade || '-', colGrade, rowY)
          .font('Helvetica')
          .text('', colComment, rowY)
          .text('', colInitial, rowY);

        rowY += rowHeight;
      }
    });

    // Table bottom line
    doc
      .moveTo(margin, rowY)
      .lineTo(pageWidth - margin, rowY)
      .stroke();

    doc.y = rowY + 10;
  }

  /**
   * Render total points section
   */
  private renderTotalPoints(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    const margin = 40;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`TOTAL POINTS: ${data.totalSubjects}`, margin, doc.y);

    doc.moveDown(0.5);
  }

  /**
   * Render grading scale at bottom
   */
  private renderGradingScale(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    const margin = 40;
    const pageWidth = doc.page.width;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('GRADING', margin, doc.y);

    doc.moveDown(0.3);

    // Grade scale table
    const scaleY = doc.y;
    const cellWidth = 45;
    let cellX = margin;

    const grades = [
      { label: 'D1', range: '80-100' },
      { label: 'D2', range: '75-79' },
      { label: 'C3', range: '80-64' },
      { label: 'C4', range: '60-60' },
      { label: 'C5', range: '50-59' },
      { label: 'C6', range: '40-49' },
      { label: 'C7', range: '31-39' },
      { label: 'C8', range: '24' },
    ];

    // Draw grade scale boxes
    grades.forEach((grade, idx) => {
      doc.rect(cellX, scaleY, cellWidth, 20).stroke();
      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(grade.label, cellX + 2, scaleY + 2, { width: cellWidth - 4 });
      doc
        .fontSize(6)
        .font('Helvetica')
        .text(grade.range, cellX + 2, scaleY + 10, { width: cellWidth - 4 });

      cellX += cellWidth;
    });

    doc.y = scaleY + 25;
  }

  /**
   * Render teacher comment and signature section
   */
  private renderTeacherCommentSection(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    const margin = 40;
    const pageWidth = doc.page.width;

    doc.moveDown(1);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Class Teacher\'s Comment:', margin, doc.y);

    doc.moveDown(1.5);

    // Comment box (empty for now, to be filled in)
    const commentBoxY = doc.y;
    doc
      .rect(margin, commentBoxY, pageWidth - 2 * margin, 40)
      .stroke();

    doc.y = commentBoxY + 45;

    // Signature line
    const sigY = doc.y;
    doc
      .moveTo(margin, sigY + 25)
      .lineTo(margin + 150, sigY + 25)
      .stroke();

    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Signature', margin, sigY + 28);

    // Date line
    const dateX = margin + 200;
    doc
      .moveTo(dateX, sigY + 25)
      .lineTo(dateX + 150, sigY + 25)
      .stroke();

    doc
      .fontSize(8)
      .text('Date', dateX + 60, sigY + 28);

    // School stamp area
    const stampX = dateX + 200;
    doc
      .rect(stampX, sigY, 120, 50)
      .stroke();

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('SCHOOL STAMP', stampX + 10, sigY + 18, { width: 100 });

    doc.y = sigY + 55;
  }

  /**
   * Render footer with disclaimer
   */
  private renderReportFooter(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    const margin = 40;
    const pageWidth = doc.page.width;

    doc.moveDown(1);

    // Horizontal line
    doc
      .moveTo(margin, doc.y)
      .lineTo(pageWidth - margin, doc.y)
      .stroke();

    doc.moveDown(0.5);

    // Disclaimer text
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .text(
        'This Report is invalid without school Stamp',
        margin,
        doc.y,
        { align: 'center', width: pageWidth - 2 * margin }
      );

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(
        '"Now or Never"',
        margin,
        doc.y,
        { align: 'center', width: pageWidth - 2 * margin }
      );

    // Print date
    const printDate = new Date(data.generatedDate).toLocaleDateString(
      'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    doc
      .fontSize(7)
      .font('Helvetica')
      .text(`Print Date: ${printDate}`, margin, doc.y + 8);
  }

  /**
   * Get ordinal suffix (st, nd, rd, th)
   */
  private getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;

    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  /**
   * Get color for grade letter
   */
  private getGradeColor(grade: string | null): string {
    if (!grade) {
      return '#000000';
    }

    switch (grade.toUpperCase()) {
      case 'A':
        return '#22c55e'; // Green
      case 'B':
        return '#3b82f6'; // Blue
      case 'C':
        return '#f59e0b'; // Amber
      case 'D':
        return '#ef4444'; // Red
      case 'F':
        return '#7f1d1d'; // Dark red
      default:
        return '#000000'; // Black
    }
  }
}
