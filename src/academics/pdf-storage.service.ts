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
  private readonly baseStoragePath = process.env.PDF_STORAGE_PATH || './pdfs';
  private readonly baseUrl = process.env.PDF_BASE_URL || '/pdfs';

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
   * Save a PDF file to storage
   */
  async savePDF(
    pdfBuffer: Buffer,
    fileName: string,
    subDirectory: string = 'reports',
  ): Promise<StoredPDFInfo> {
    try {
      const dirPath = path.join(this.baseStoragePath, subDirectory);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, fileName);

      // Write file
      fs.writeFileSync(filePath, pdfBuffer);

      // Get file stats
      const stats = fs.statSync(filePath);

      return {
        fileName,
        filePath,
        url: this.getFileUrl(subDirectory, fileName),
        size: stats.size,
        createdAt: stats.birthtime,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to save PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get the full URL for a stored PDF file
   */
  getFileUrl(subDirectory: string, fileName: string): string {
    return `${this.baseUrl}/${subDirectory}/${fileName}`;
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

  /**
   * Get storage directory path for a subdirectory
   */
  getStoragePath(subDirectory: string = 'reports'): string {
    return path.join(this.baseStoragePath, subDirectory);
  }

  /**
   * Get base storage path
   */
  getBaseStoragePath(): string {
    return this.baseStoragePath;
  }

  /**
   * Clean up old PDF files (older than specified days)
   * Useful for maintenance
   */
  async cleanupOldFiles(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      const reportsDir = this.getStoragePath('reports');
      if (!fs.existsSync(reportsDir)) {
        return 0;
      }

      const files = fs.readdirSync(reportsDir);
      for (const file of files) {
        const filePath = path.join(reportsDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      throw new BadRequestException(
        `Failed to cleanup old files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
