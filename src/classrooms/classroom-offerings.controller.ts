import { Controller, Get, Post, Request, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('years/:yearId/classroom-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomOfferingsController {
  // Deprecated: classroom-offerings feature removed. Keep endpoint for compatibility and return guidance.

  @Get()
  list(@Request() req: AuthenticatedRequest) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    throw new BadRequestException('Classroom offerings are deprecated. Use classroom-definitions and enrollments endpoints instead.');
  }

  @Post()
  create(@Request() req: AuthenticatedRequest) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    throw new BadRequestException('Classroom offerings are deprecated. Create enrollments against classroom-definitions for the academic year.');
  }

}
