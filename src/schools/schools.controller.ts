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
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

interface AuthenticatedRequest extends Request {
  user: any;
}

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.create(createSchoolDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userRole = req.user.role;
    if (userRole === 'SUPER_ADMIN') {
      return this.schoolsService.findOne(id);
    }
    if (userRole === 'SCHOOL_ADMIN' && req.user.school_id === id) {
      return this.schoolsService.findOne(id);
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
    const userRole = req.user.role;
    if (userRole === 'SUPER_ADMIN') {
      return this.schoolsService.update(id, updateSchoolDto);
    }
    if (userRole === 'SCHOOL_ADMIN' && req.user.school_id === id) {
      return this.schoolsService.update(id, updateSchoolDto);
    }
    throw new ForbiddenException('Insufficient permissions to update this school');
  }

  @Get(':id/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getSettings(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userRole = req.user.role;
    if (userRole === 'SUPER_ADMIN') {
      return this.schoolsService.getSettings(id);
    }
    if (userRole === 'SCHOOL_ADMIN' && req.user.school_id === id) {
      return this.schoolsService.getSettings(id);
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
    const userRole = req.user.role;
    if (userRole === 'SUPER_ADMIN') {
      return this.schoolsService.updateSettings(id, updateSettingsDto);
    }
    if (userRole === 'SCHOOL_ADMIN' && req.user.school_id === id) {
      return this.schoolsService.updateSettings(id, updateSettingsDto);
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
