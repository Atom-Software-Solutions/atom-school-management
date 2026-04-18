import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../middleware/tenant.middleware';

/**
 * Guard to ensure tenant context is properly set
 * Validates that non-SUPER_ADMIN users can only access their own tenant
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const tenantId = request.tenantId;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // SUPER_ADMIN can access any tenant (tenantId is null)
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // For other roles, tenantId must match user's school_id
    if (tenantId === undefined) {
      throw new ForbiddenException('Tenant context not available');
    }

    if (tenantId !== user.school_id) {
      throw new ForbiddenException('Access denied: tenant mismatch');
    }

    return true;
  }
}
