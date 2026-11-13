import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { BillingAccessService } from './billing-access.service';
import { ListPaymentsQueryDto, RecordPaymentDto, ReversePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Billing - Payments')
@ApiBearerAuth()
@Controller('schools/:schoolId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    private readonly access: BillingAccessService,
  ) {}

  @Post('invoices/:invoiceId/payments')
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Repeat-safe key; resending returns the original payment' })
  async record(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body() dto: RecordPaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.record(schoolId, req.user!.id, invoiceId, dto, idempotencyKey);
  }

  @Get('invoices/:invoiceId/payments')
  async forInvoice(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.listForInvoice(schoolId, invoiceId);
  }

  @Get('payments')
  async list(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() query: ListPaymentsQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.list(schoolId, query);
  }

  @Get('payments/:id/receipt')
  async receipt(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.receipt(schoolId, id);
  }

  @Post('payments/:id/reverse')
  async reverse(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReversePaymentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.reverse(schoolId, req.user!.id, id, dto);
  }
}
