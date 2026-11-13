import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { BillingAccessService } from './billing-access.service';
import {
  CopyFeeStructuresDto,
  CreateFeeStructureDto,
  ListFeeStructuresQueryDto,
  UpdateFeeStructureDto,
} from './dto/fee-structure.dto';
import { FeeStructuresService } from './fee-structures.service';

@ApiTags('Billing - Fee structures')
@ApiBearerAuth()
@Controller('schools/:schoolId/fee-structures')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
export class FeeStructuresController {
  constructor(
    private readonly service: FeeStructuresService,
    private readonly access: BillingAccessService,
  ) {}

  @Get()
  async list(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() query: ListFeeStructuresQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.list(schoolId, query);
  }

  @Post()
  async create(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: CreateFeeStructureDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.create(schoolId, req.user!.id, dto);
  }

  @Post('copy')
  async copy(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: CopyFeeStructuresDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.copy(schoolId, req.user!.id, dto);
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
    @Body() dto: UpdateFeeStructureDto,
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
