import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { BillingAccessService } from './billing-access.service';
import { CreateFeeCategoryDto, UpdateFeeCategoryDto } from './dto/fee-category.dto';
import { FeeCategoriesService } from './fee-categories.service';

@ApiTags('Billing - Fee categories')
@ApiBearerAuth()
@Controller('schools/:schoolId/fee-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
export class FeeCategoriesController {
  constructor(
    private readonly service: FeeCategoriesService,
    private readonly access: BillingAccessService,
  ) {}

  @Get()
  async list(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query('includeInactive') includeInactive: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.list(schoolId, includeInactive !== 'false');
  }

  @Post()
  async create(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: CreateFeeCategoryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.create(schoolId, dto);
  }

  @Post('seed-defaults')
  async seedDefaults(@Param('schoolId', ParseUUIDPipe) schoolId: string, @Request() req: AuthenticatedRequest) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.seedDefaults(schoolId);
  }

  @Get(':id')
  async get(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.get(schoolId, id);
  }

  @Patch(':id')
  async update(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeeCategoryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.update(schoolId, id, dto);
  }

  @Post(':id/deactivate')
  async deactivate(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.setActive(schoolId, id, false);
  }

  @Post(':id/activate')
  async activate(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.setActive(schoolId, id, true);
  }
}
