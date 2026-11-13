import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { BillingAccessService } from './billing-access.service';
import { CreateFeeAssignmentsDto, UpdateFeeAssignmentDto } from './dto/fee-assignment.dto';
import { FeeAssignmentsService } from './fee-assignments.service';

@ApiTags('Billing - Fee assignments')
@ApiBearerAuth()
@Controller('schools/:schoolId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
export class FeeAssignmentsController {
  constructor(
    private readonly service: FeeAssignmentsService,
    private readonly access: BillingAccessService,
  ) {}

  @Get('students/:studentId/fee-assignments')
  async forStudent(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.listForStudent(schoolId, studentId);
  }

  @Get('fee-structures/:id/eligible-students')
  async eligible(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.eligibleStudents(schoolId, id);
  }

  @Post('fee-assignments')
  async assign(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: CreateFeeAssignmentsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.assign(schoolId, req.user!.id, dto);
  }

  @Patch('fee-assignments/:id')
  async update(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeeAssignmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.update(schoolId, req.user!.id, id, dto);
  }

  @Post('fee-assignments/:id/remove')
  async remove(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.remove(schoolId, id);
  }
}
