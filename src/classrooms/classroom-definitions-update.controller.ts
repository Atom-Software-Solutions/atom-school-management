import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ClassroomsService } from './classrooms.service';
import { UpdateClassroomDefinitionDto } from './dto/update-classroom-definition.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('classroom-definitions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomDefinitionsUpdateController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const adminUserId = req.user.id;
    return this.classroomsService.getDefinitionById(id, adminUserId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClassroomDefinitionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const adminUserId = req.user.id;
    return this.classroomsService.updateDefinitionById(id, adminUserId, {
      name: dto.name,
      level: dto.level || null,
      isArchived: dto.isArchived,
      ordinal: dto.ordinal,
    });
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const adminUserId = req.user.id;
    return this.classroomsService.deleteDefinitionById(id, adminUserId);
  }
}
