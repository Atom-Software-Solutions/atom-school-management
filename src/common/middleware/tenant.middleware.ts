import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tenantId?: string | null; // null for SUPER_ADMIN (no restriction), undefined if not set
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const user = req.user;

    if (!user) {
      // No user authenticated, skip tenant context
      req.tenantId = undefined;
      return next();
    }

    // SUPER_ADMIN can access any tenant (null = no restriction)
    if (user.role === 'SUPER_ADMIN') {
      req.tenantId = null;
    } else {
      // For other roles, use their school_id as tenant context
      req.tenantId = user.school_id || undefined;
    }

    next();
  }
}
