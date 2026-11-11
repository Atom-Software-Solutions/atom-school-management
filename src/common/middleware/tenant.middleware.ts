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
      req.tenantId = undefined;
      return next();
    }

    if (user.role === 'SUPER_ADMIN') {
      req.tenantId = null;
    } else {
      req.tenantId = user.school_id ?? undefined;
    }

    next();
  }
}
