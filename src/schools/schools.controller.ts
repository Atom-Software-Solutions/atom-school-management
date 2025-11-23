import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@ApiTags('schools')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new school' })
  @ApiResponse({
    status: 201,
    description: 'School created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  create(@Body() createSchoolDto: CreateSchoolDto, @Request() req: AuthenticatedRequest) {
    const creatorUserId = (req as any).user?.id as string | undefined;
    return this.schoolsService.create(createSchoolDto, creatorUserId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all schools (Super Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of schools retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SUPER_ADMIN only' })
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get school details' })
  @ApiParam({ name: 'id', description: 'School ID' })
  @ApiResponse({
    status: 200,
    description: 'School details retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'School not found' })
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const userRole = req.user.role;
    if (userRole === 'SUPER_ADMIN') {
      return this.schoolsService.findOne(id);
    }
    if (userRole === 'SCHOOL_ADMIN') {
      return this.schoolsService.findIfAdmin(id, req.user.id);
    }
    throw new ForbiddenException('Insufficient permissions to view this school');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  update(
    @Param('id') id: string,
    @Body() updateSchoolDto: UpdateSchoolDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const userRole = req.user.role;
    if (userRole === 'SUPER_ADMIN') {
      return this.schoolsService.update(id, updateSchoolDto);
    }
    if (userRole === 'SCHOOL_ADMIN') {
      return this.schoolsService.updateIfAdmin(id, req.user.id, updateSchoolDto);
    }
    throw new ForbiddenException('Insufficient permissions to update this school');
  }

  @Get(':id/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getSettings(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const userRole = req.user.role;
    if (userRole === 'SUPER_ADMIN') {
      return this.schoolsService.getSettings(id);
    }
    if (userRole === 'SCHOOL_ADMIN') {
      return this.schoolsService.getSettingsIfAdmin(id, req.user.id);
    }
    throw new ForbiddenException(
      'Insufficient permissions to view school settings',
    );
  }

  @Patch(':id/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateSettings(
    @Param('id') id: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    const userRole = req.user.role;
    if (userRole === 'SUPER_ADMIN') {
      return this.schoolsService.updateSettings(id, updateSettingsDto);
    }
    if (userRole === 'SCHOOL_ADMIN') {
      return this.schoolsService.updateSettingsIfAdmin(id, req.user.id, updateSettingsDto);
    }
    throw new ForbiddenException(
      'Insufficient permissions to update school settings',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.schoolsService.remove(id);
  }
}
