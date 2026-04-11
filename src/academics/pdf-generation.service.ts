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

  constructor() {
    this.ensureStorageDirectory();
  }

  /**
   * Ensure the PDF storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.pdfStoragePath)) {
      fs.mkdirSync(this.pdfStoragePath, { recursive: true });
    }
  }

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
    // Header
    this.renderHeader(doc, data);

    // Student Information Section
    doc.moveDown(1);
    this.renderStudentInfo(doc, data);

    // Overall Performance Section
    doc.moveDown(1);
    this.renderOverallPerformance(doc, data);

    // Ranking Section (if available)
    if (data.rank && data.totalStudents) {
      doc.moveDown(1);
      this.renderRanking(doc, data);
    }

    // Subject Performance Table
    doc.moveDown(1);
    this.renderSubjectsTable(doc, data);

    // Remarks Section (if available)
    if (data.remarks) {
      doc.moveDown(1);
      this.renderRemarks(doc, data);
    }

    // Footer
    doc.moveDown(2);
    this.renderFooter(doc, data);
  }

  /**
   * Render the report card header with school name and title
   */
  private renderHeader(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    // School name (centered)
    doc.fontSize(18).font('Helvetica-Bold').text(data.schoolName, 0, doc.y, {
      align: 'center',
      width: pageWidth,
    });

    // Report title (centered)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('ACADEMIC REPORT CARD', 0, doc.y + 5, {
        align: 'center',
        width: pageWidth,
      });

    // Horizontal line
    doc
      .moveTo(40, doc.y + 10)
      .lineTo(pageWidth - 40, doc.y + 10)
      .stroke();

    doc.moveDown(1);
  }

  /**
   * Render student information section
   */
  private renderStudentInfo(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('STUDENT INFORMATION', 0, doc.y);

    doc.fontSize(9).font('Helvetica').y += 12;

    const leftMargin = 50;
    const rightMargin = doc.page.width / 2 + 20;

    // Left column
    const yPosition = doc.y;
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Student Name:', leftMargin, yPosition);
    doc.font('Helvetica').text(data.studentName, leftMargin + 110, yPosition);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Academic Year:', leftMargin, yPosition + 20);
    doc
      .font('Helvetica')
      .text(data.academicYear, leftMargin + 110, yPosition + 20);

    // Right column
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Student Number:', rightMargin, yPosition);
    doc.font('Helvetica').text(data.studentNumber, rightMargin + 95, yPosition);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Term:', rightMargin, yPosition + 20);
    doc
      .font('Helvetica')
      .text(
        `${data.term} (${this.getOrdinalSuffix(data.termOrdinal)})`,
        rightMargin + 95,
        yPosition + 20,
      );

    doc.y = yPosition + 50;
  }

  /**
   * Render overall performance section
   */
  private renderOverallPerformance(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('OVERALL PERFORMANCE', 0, doc.y);

    doc.y += 12;

    const boxWidth = 150;
    const boxHeight = 60;
    const boxX = 50;
    const boxY = doc.y;

    // Box 1: Overall Average
    doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Overall Average', boxX + 10, boxY + 10, {
        width: boxWidth - 20,
      });

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(data.overallAverage.toFixed(2), boxX + 10, boxY + 25, {
        width: boxWidth - 20,
        align: 'center',
      });

    // Box 2: Letter Grade
    const gradeBoxX = boxX + boxWidth + 20;
    doc.rect(gradeBoxX, boxY, boxWidth, boxHeight).stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Grade', gradeBoxX + 10, boxY + 10, {
        width: boxWidth - 20,
      });

    const displayedOverallGrade = data.overallLetterGrade ?? 'N/A';

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor(this.getGradeColor(displayedOverallGrade))
      .text(displayedOverallGrade, gradeBoxX + 10, boxY + 25, {
        width: boxWidth - 20,
        align: 'center',
      })
      .fillColor('#000000');

    // Box 3: Subjects Count
    const subjectBoxX = gradeBoxX + boxWidth + 20;
    doc.rect(subjectBoxX, boxY, boxWidth, boxHeight).stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Subjects', subjectBoxX + 10, boxY + 10, {
        width: boxWidth - 20,
      });

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(data.totalSubjects.toString(), subjectBoxX + 10, boxY + 25, {
        width: boxWidth - 20,
        align: 'center',
      });

    doc.y = boxY + boxHeight + 20;
  }

  /**
   * Render ranking information
   */
  private renderRanking(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    doc.fontSize(10).font('Helvetica-Bold').text('CLASS RANKING', 0, doc.y);

    doc.y += 12;

    const rankText = `${data.rank!}${this.getOrdinalSuffix(data.rank!)} out of ${data.totalStudents!} students`;

    doc.fontSize(11).font('Helvetica-Bold').text(rankText, 50, doc.y, {
      width: 300,
    });
  }

  /**
   * Render subjects performance table
   */
  private renderSubjectsTable(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('SUBJECT PERFORMANCE', 0, doc.y);

    doc.y += 12;

    const tableTop = doc.y;
    const col1X = 50;
    const col2X = 250;
    const col3X = 350;
    const col4X = 450;
    const rowHeight = 25;

    // Table header
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Subject', col1X, tableTop)
      .text('Code', col2X, tableTop)
      .text('Average', col3X, tableTop)
      .text('Grade', col4X, tableTop);

    // Draw header underline
    doc
      .moveTo(col1X, tableTop + 15)
      .lineTo(doc.page.width - 50, tableTop + 15)
      .stroke();

    // Table rows
    let yPosition = tableTop + 20;
    data.subjects.forEach((subject) => {
      // Check if we need a new page
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40;
      }

      doc
        .fontSize(9)
        .font('Helvetica')
        .text(subject.name, col1X, yPosition)
        .text(subject.code, col2X, yPosition)
        .text(subject.average.toFixed(2), col3X, yPosition);

      // Draw grade badge
      doc
        .font('Helvetica-Bold')
        .fillColor(this.getGradeColor(subject.letterGrade))
        .text(subject.letterGrade ?? '-', col4X, yPosition, {})
        .fillColor('#000000');

      yPosition += rowHeight;
    });

    // Draw table bottom line
    doc
      .moveTo(col1X, yPosition)
      .lineTo(doc.page.width - 50, yPosition)
      .stroke();

    doc.y = yPosition + 10;
  }

  /**
   * Render remarks section
   */
  private renderRemarks(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    doc.fontSize(10).font('Helvetica-Bold').text('REMARKS', 0, doc.y);

    doc.y += 12;

    doc
      .fontSize(9)
      .font('Helvetica')
      .text(data.remarks ?? '', 50, doc.y, {
        width: doc.page.width - 100,
        align: 'left',
      });

    doc.moveDown(1);
  }

  /**
   * Render footer with generation date and status
   */
  private renderFooter(
    doc: PDFDocumentInstance,
    data: ReportCardPDFData,
  ): void {
    // Horizontal line
    doc
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke();

    doc.moveDown(0.5);

    const pageWidth = doc.page.width;
    const generatedDate = new Date(data.generatedDate).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

    doc
      .fontSize(8)
      .font('Helvetica')
      .text(`Generated: ${generatedDate}`, 50, doc.y)
      .text(`Status: ${data.status.toUpperCase()}`, pageWidth - 150, doc.y, {
        align: 'right',
      });

    if (data.publishedDate) {
      const publishedDate = new Date(data.publishedDate).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      );
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(`Published: ${publishedDate}`, 50, doc.y + 12);
    }
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
