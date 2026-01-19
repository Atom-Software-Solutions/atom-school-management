import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Customize how missing/invalid tokens are reported.
   * This ensures callers of protected endpoints (like POST /schools)
   * get a clearer 401 error when no Bearer token is supplied.
   */
  handleRequest(err: any, user: any, info: any): any {
    if (err || !user) {
      // Extract a more specific message from the error or info object
      const msg =
        err?.message ||
        (typeof info === 'string' ? info : info?.message) ||
        'Authentication token is missing or invalid. Please provide a valid Bearer token.';

      throw new UnauthorizedException(msg);
    }
    return user;
  }
}
