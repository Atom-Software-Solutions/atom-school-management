import { Body, Controller, ForbiddenException, Get, Logger, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDefinitionDto } from './dto/create-classroom-definition.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('schools/:schoolId/classroom-definitions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomDefinitionsController {
  private readonly logger = new Logger(ClassroomDefinitionsController.name);

  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get()
  list(@Param('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const adminUserId = req.user.id;
    return this.classroomsService.listDefinitions(schoolId, adminUserId);
  }

  @Post()
  create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateClassroomDefinitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }

    // Debug: confirm all IDs used in the SchoolAdmin lookup
    // Note: Nest's Logger.debug may be suppressed depending on log levels (e.g. prod).
    // Keeping a console.log as well so you always see it.
    this.logger.debug(
      `POST classroom-definitions: schoolId(route)=${schoolId} userId(jwt)=${req.user.id} user.school_id(jwt)=${req.user.school_id}`,
    );
    console.log('POST classroom-definitions debug', {
      schoolIdRoute: schoolId,
      userIdJwt: req.user.id,
      userSchoolIdJwt: req.user.school_id,
    });

    const adminUserId = req.user.id;
    return this.classroomsService.createDefinition(schoolId, adminUserId, {
      name: dto.name,
      level: dto.level || null,
    });
  }

}
