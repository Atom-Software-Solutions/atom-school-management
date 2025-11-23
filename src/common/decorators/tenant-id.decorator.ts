import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../middleware/tenant.middleware';

/**
 * Decorator to extract tenant ID from request
 * Returns null for SUPER_ADMIN (no restriction), undefined if not set
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tenantId;
  },
);

