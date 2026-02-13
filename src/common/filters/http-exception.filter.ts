import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let resBody: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      resBody = exception.getResponse();
    } else {
      resBody = { message: (exception as any)?.message || 'Internal server error' };
    }

    let message = 'An error occurred';
    let errors: any = undefined;
    let param: any = undefined;

    if (typeof resBody === 'string') {
      message = resBody;
    } else if (resBody && typeof resBody === 'object') {
      if (Array.isArray(resBody.message)) {
        message = 'There were validation errors with your request.';
        errors = resBody.message.map((m: any) => {
          if (typeof m === 'string') {
            const match = m.match(/^(.+?)\s/);
            const field = match ? match[1] : null;
            return { field, message: m };
          }
          if (m?.constraints) {
            const first = Object.values(m.constraints)[0];
            return { field: m.property || null, message: first };
          }
          return { field: m?.field || null, message: m?.message || JSON.stringify(m) };
        });
      } else if (resBody.message) {
        message = typeof resBody.message === 'string' ? resBody.message : JSON.stringify(resBody.message);
      } else if (resBody.error) {
        message = resBody.error;
      }
      if (resBody.param) param = resBody.param;
    }

    const type = this.mapType(status, exception);

    const payload: any = {
      error: {
        code: status,
        type,
        message,
      },
    };

    if (param) payload.error.param = param;
    if (errors) payload.error.errors = errors;

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, (exception as any)?.stack || JSON.stringify(exception));
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${message}`);
    }

    response.status(status).json(payload);
  }

  private mapType(status: number, exception: unknown) {
    if (status === HttpStatus.BAD_REQUEST) {
      if (exception instanceof HttpException) {
        const res = exception.getResponse();
        if (res && typeof res === 'object' && Array.isArray((res as any).message)) {
          return 'validation_error';
        }
      }
      return 'invalid_request_error';
    }
    if (status === HttpStatus.NOT_FOUND) return 'not_found_error';
    if (status === HttpStatus.FORBIDDEN) return 'forbidden_error';
    if (status === HttpStatus.UNAUTHORIZED) return 'authentication_error';
    if (status === HttpStatus.CONFLICT) return 'conflict_error';
    if (status >= 500) return 'internal_server_error';
    return 'unknown_error';
  }
}
