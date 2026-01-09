import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

// Type guard to check if error is a Prisma error
function isPrismaError(error: any): error is { code: string; meta?: any } {
  return error && typeof error.code === 'string' && error.code.startsWith('P');
}

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // If it's already a NestJS HTTP exception, let NestJS handle it
    // We need to check this first to avoid interfering with normal exception handling
    if (exception instanceof HttpException) {
      // Re-throw to let NestJS default exception filter handle it
      throw exception;
    }

    // Handle Prisma Client Known Request Errors
    if (isPrismaError(exception)) {
      switch (exception.code) {
        case 'P2002':
          // Unique constraint violation
          const target = Array.isArray(exception.meta?.target)
            ? exception.meta?.target[0]
            : exception.meta?.target;
          
          const field = typeof target === 'string' ? target : 'field';
          const message = `A record with this ${field} already exists`;
          
          return response.status(HttpStatus.CONFLICT).json({
            statusCode: HttpStatus.CONFLICT,
            message,
            error: 'Conflict',
          });

        case 'P2025':
          // Record not found
          return response.status(HttpStatus.NOT_FOUND).json({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Record not found',
            error: 'Not Found',
          });

        case 'P2003':
          // Foreign key constraint violation
          return response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid reference: related record does not exist',
            error: 'Bad Request',
          });

        case 'P2014':
          // Required relation violation
          return response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid relation: required relation is missing',
            error: 'Bad Request',
          });

        default:
          // Other Prisma errors
          return response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Database operation failed',
            error: 'Bad Request',
          });
      }
    }

    // For any other unhandled exceptions, return 500
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  }
}
