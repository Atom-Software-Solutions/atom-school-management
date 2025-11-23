import { Body, Controller, ForbiddenException, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ClassroomsService } from './classrooms.service';
import { UpdateClassroomOfferingDto } from './dto/update-classroom-offering.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('classroom-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomOfferingsUpdateController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const adminUserId = req.user.id;
    return this.classroomsService.getOfferingById(id, adminUserId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClassroomOfferingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const adminUserId = req.user.id;
    return this.classroomsService.updateOffering(id, adminUserId, {
      displayName: dto.displayName,
      isActive: dto.isActive,
    });
  }
}

