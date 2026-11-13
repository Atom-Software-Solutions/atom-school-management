import { Controller, Get, Param, ParseUUIDPipe, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { BillingAccessService } from './billing-access.service';
import { BillingReportsService } from './billing-reports.service';

class ReportScopeQuery {
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsUUID() termId?: string;
}
class InvoiceExportQuery extends ReportScopeQuery {
  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
}
class PaymentExportQuery {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
class StatementQuery {
  @IsOptional() @IsUUID() academicYearId?: string;
}

@ApiTags('Billing - Reports')
@ApiBearerAuth()
@Controller('schools/:schoolId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
export class BillingReportsController {
  constructor(
    private readonly reports: BillingReportsService,
    private readonly access: BillingAccessService,
  ) {}

  @Get('billing/summary')
  async summary(@Param('schoolId', ParseUUIDPipe) schoolId: string, @Query() q: ReportScopeQuery, @Request() req: AuthenticatedRequest) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.reports.summary(schoolId, q);
  }

  @Get('billing/by-class')
  async byClass(@Param('schoolId', ParseUUIDPipe) schoolId: string, @Query() q: ReportScopeQuery, @Request() req: AuthenticatedRequest) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.reports.byClass(schoolId, q);
  }

  @Get('students/:studentId/statement')
  async statement(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() q: StatementQuery,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.reports.statement(schoolId, studentId, q.academicYearId);
  }

  @Get('billing/export/invoices.csv')
  async exportInvoices(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() q: InvoiceExportQuery,
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    const csv = await this.reports.invoicesCsv(schoolId, q);
    this.csvHeaders(res, `invoices-${today()}.csv`);
    return csv;
  }

  @Get('billing/export/payments.csv')
  async exportPayments(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() q: PaymentExportQuery,
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    const csv = await this.reports.paymentsCsv(schoolId, q);
    this.csvHeaders(res, `payments-${today()}.csv`);
    return csv;
  }

  private csvHeaders(res: Response, filename: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
  }
}

const today = () => new Date().toISOString().slice(0, 10);
