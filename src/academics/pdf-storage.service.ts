import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredPDFInfo {
  fileName: string;
  filePath: string;
  url: string;
  size: number;
  createdAt: Date;
}

@Injectable()
export class PdfStorageService {

  /**
   * Generate a unique file name for a report card PDF
   * Format: reportcard-<studentId>-<schoolId>-<timestamp>-<random>.pdf
   */
  generateFileName(
    studentId: string,
    schoolId: string,
    termId: string,
  ): string {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(4).toString('hex');
    // Clean up IDs to make filenames safe
    const sanitizedStudentId = studentId.substring(0, 8);
    const sanitizedTermId = termId.substring(0, 8);
    return `reportcard-${sanitizedStudentId}-${sanitizedTermId}-${timestamp}-${randomHash}.pdf`;
  }

  /**
   * Load a PDF file from storage
   */
  async loadPDF(filePath: string): Promise<Buffer> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException(`PDF file not found: ${filePath}`);
      }

      return fs.promises.readFile(filePath);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to load PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if a PDF file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return fs.existsSync(filePath);
  }

  /**
   * Delete a PDF file
   */
  async deletePDF(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException(`PDF file not found: ${filePath}`);
      }
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get file size: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
