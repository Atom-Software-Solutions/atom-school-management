import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomOfferingDto } from './dto/create-classroom-offering.dto';
import { UpdateClassroomOfferingDto } from './dto/update-classroom-offering.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('years/:yearId/classroom-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomOfferingsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get()
  list(@Param('yearId') yearId: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const adminUserId = req.user.id;
    return this.classroomsService.listOfferings(yearId, adminUserId);
  }

  @Post()
  create(
    @Param('yearId') yearId: string,
    @Body() dto: CreateClassroomOfferingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const adminUserId = req.user.id;
    return this.classroomsService.createOffering(yearId, adminUserId, {
      classroomDefinitionId: dto.classroomDefinitionId,
      displayName: dto.displayName,
    });
  }

}
