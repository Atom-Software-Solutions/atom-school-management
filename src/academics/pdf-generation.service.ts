import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import ReportCard, { ReportCardData, ReportCardConfig } from './report-card.component';

@Injectable()
export class PdfGenerationService {
  /**
   * Generate a PDF report card by rendering the React component and converting to PDF
   */
  async generateReportCardPDF(data: ReportCardData, config?: Partial<ReportCardConfig>): Promise<Buffer> {
    const defaultConfig: ReportCardConfig = {
      showCredits: true,
      useGPA: true,
      showRank: false,
      showAttendance: false,
      showConduct: false,
      showActivities: false,
      ...config,
    };

    // Render the React component to HTML string
    const htmlContent = renderToString(React.createElement(ReportCard, { data, config: defaultConfig }));

    // Wrap in a full HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Report Card</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            @page {
              size: A4;
              margin: 0;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}