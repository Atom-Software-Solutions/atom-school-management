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

    function extractValidationErrors(arr: any[]): Array<{ field: string | null; message: string }> {
      const out: Array<{ field: string | null; message: string }> = [];

      function recurse(node: any, parentPath?: string) {
        if (!node) return;
        if (typeof node === 'string') {
          out.push({ field: parentPath || null, message: node });
          return;
        }

        // ValidationError shape from class-validator
        if (node.constraints && typeof node.constraints === 'object') {
          Object.values(node.constraints).forEach((m: any) => {
            const fieldPath = parentPath ? `${parentPath}.${node.property}` : node.property || null;
            out.push({ field: fieldPath, message: String(m) });
          });
        }

        // If there are children, recurse into them to collect nested messages
        if (Array.isArray(node.children) && node.children.length > 0) {
          node.children.forEach((child: any) => recurse(child, parentPath ? `${parentPath}.${node.property}` : node.property));
        }

        // If this node is an array (sometimes the top-level message is an array of strings or objects)
        if (Array.isArray(node)) {
          node.forEach((n) => recurse(n, parentPath));
        }
      }

      arr.forEach((item) => recurse(item));
      return out;
    }

    if (typeof resBody === 'string') {
      message = resBody;
    } else if (resBody && typeof resBody === 'object') {
      // Check if exceptionFactory already provided structured errors
      if (Array.isArray(resBody.errors) && resBody.errors.length > 0 && resBody.errors[0].field !== undefined) {
        message = 'There were validation errors with your request.';
        errors = resBody.errors;
      } else if (Array.isArray(resBody.message)) {
        message = 'There were validation errors with your request.';
        errors = extractValidationErrors(resBody.message);
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
      if (status === HttpStatus.BAD_REQUEST) {
        try {
          this.logger.debug('BadRequest response body: ' + JSON.stringify(resBody, null, 2));
        } catch (e) {
          this.logger.debug('BadRequest response body logging failed');
        }
      }
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
