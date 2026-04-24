const isServerless = !!process.env.AWS_EXECUTION_ENV || !!process.env.VERCEL;
const puppeteer = isServerless
  ? require('puppeteer-core')
  : require('puppeteer');
import { Injectable } from '@nestjs/common';
import chromium from '@sparticuz/chromium';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import ReportCard, { ReportCardConfig, ReportCardData } from './report-card.component';

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

    const launchOptions = isServerless
      ? {
        args: chromium.args,
        defaultViewport: { width: 1280, height: 800 },
        executablePath: await chromium.executablePath(),
        headless: true,
      }
      : {
        defaultViewport: { width: 1280, height: 800 },
        headless: true,
      };

    const browser = await puppeteer.launch(launchOptions);

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

    await browser.close();
    return Buffer.from(pdfBuffer);
  }
}
