import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../middleware/tenant.middleware';

/**
 * Guard to ensure tenant context is properly set.
 * IMPORTANT: Passport populates req.user inside guards, so we must resolve tenant
 * context from the authenticated user here instead of assuming the middleware has
 * already run before the auth guard.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const tenantId = request.tenantId ?? user.school_id ?? null;
    request.tenantId = tenantId;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (tenantId === null || tenantId === undefined) {
      throw new ForbiddenException('Tenant context not available');
    }

    if (tenantId !== user.school_id) {
      throw new ForbiddenException('Access denied: tenant mismatch');
    }

    return true;
  }
}
