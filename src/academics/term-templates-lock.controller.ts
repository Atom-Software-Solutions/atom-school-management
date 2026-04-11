import { Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AcademicsService } from './academics.service';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('term-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class TermTemplatesLockController {
  constructor(private readonly academics: AcademicsService) {}

  @Patch(':id/lock')
  lock(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = req.user?.id as string;
    return this.academics.lockTemplate(id, adminUserId);
  }
}
