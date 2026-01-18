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
    console.log("user:user " + user);
    if (err || !user) {
      // Prefer the original error if present, otherwise return a clearer message
      throw err || new UnauthorizedException('Authentication token is missing or invalid. Please provide a valid Bearer token.');
    }
    return user;
  }
}
