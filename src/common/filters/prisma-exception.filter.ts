import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

const logger = new Logger('PrismaExceptionFilter');

// Type guard to check if error is a Prisma error
function isPrismaError(error: any): error is { code: string; meta?: any } {
  return error && typeof error.code === 'string' && error.code.startsWith('P');
}

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // If it's already a NestJS HTTP exception, rethrow so the global HTTP filter formats it
    if (exception instanceof HttpException) {
      throw exception;
    }

    if (isPrismaError(exception)) {
      let status = HttpStatus.BAD_REQUEST;
      let message = 'Database operation failed';
      let type = 'invalid_request_error';
      const code = exception.code;

      switch (code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          type = 'conflict_error';
          const target = Array.isArray(exception.meta?.target)
            ? exception.meta?.target[0]
            : exception.meta?.target;
          const field = typeof target === 'string' ? target : undefined;
          message = field
            ? `A record with this ${field} already exists`
            : 'Unique constraint violation';

          const payload: any = {
            error: {
              code: status,
              type,
              message,
            },
          };
          if (field) payload.error.param = field;

          logger.warn(
            `${request.method} ${request.url} -> ${status}: ${message}`,
          );
          return response.status(status).json(payload);
        }

        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          type = 'not_found_error';
          message = 'Record not found';
          const payload = { error: { code: status, type, message } };
          logger.warn(
            `${request.method} ${request.url} -> ${status}: ${message}`,
          );
          return response.status(status).json(payload);
        }

        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          type = 'invalid_request_error';
          message = 'Invalid reference: related record does not exist';
          const payload = { error: { code: status, type, message } };
          logger.warn(
            `${request.method} ${request.url} -> ${status}: ${message}`,
          );
          return response.status(status).json(payload);
        }

        case 'P2014': {
          status = HttpStatus.BAD_REQUEST;
          type = 'invalid_request_error';
          message = 'Invalid relation: required relation is missing';
          const payload = { error: { code: status, type, message } };
          logger.warn(
            `${request.method} ${request.url} -> ${status}: ${message}`,
          );
          return response.status(status).json(payload);
        }

        default: {
          status = HttpStatus.BAD_REQUEST;
          type = 'invalid_request_error';
          message = 'Database operation failed';
          const payload = { error: { code: status, type, message } };
          logger.warn(
            `${request.method} ${request.url} -> ${status}: ${code} - ${message}`,
          );
          return response.status(status).json(payload);
        }
      }
    }

    // For any other unhandled exceptions, log and return 500 in the same structured shape
    logger.error(
      'Unhandled exception in PrismaExceptionFilter',
      exception as any,
    );
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        type: 'internal_server_error',
        message: 'Internal server error',
      },
    });
  }
}
