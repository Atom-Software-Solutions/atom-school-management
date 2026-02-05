import { Controller, Get, Patch, Request, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('classroom-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomOfferingsUpdateController {
  // Deprecated endpoints: classroom-offerings removed. Respond with guidance.

  @Get(':id')
  getOne(@Request() req: AuthenticatedRequest) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    throw new BadRequestException('Classroom offerings are deprecated. Use classroom-definitions endpoints.');
  }

  @Patch(':id')
  update(@Request() req: AuthenticatedRequest) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    throw new BadRequestException('Classroom offerings are deprecated. Manage classroom definitions instead.');
  }
}

