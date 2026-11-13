import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { BillingAccessService } from './billing-access.service';
import {
  CancelInvoiceDto,
  CreateAdhocInvoiceDto,
  GenerateInvoicesDto,
  ListInvoicesQueryDto,
  UpdateDraftInvoiceDto,
} from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Billing - Invoices')
@ApiBearerAuth()
@Controller('schools/:schoolId/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
export class InvoicesController {
  constructor(
    private readonly service: InvoicesService,
    private readonly access: BillingAccessService,
  ) {}

  @Post('generate/preview')
  async preview(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: GenerateInvoicesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.preview(schoolId, dto);
  }

  @Post('generate')
  async generate(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: GenerateInvoicesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.generate(schoolId, req.user!.id, dto);
  }

  @Get('batches')
  async batches(@Param('schoolId', ParseUUIDPipe) schoolId: string, @Request() req: AuthenticatedRequest) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.listBatches(schoolId);
  }

  @Post('batches/:batchId/issue')
  async issueBatch(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.issueBatch(schoolId, req.user!.id, batchId);
  }

  @Delete('batches/:batchId')
  async discardBatch(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.discardBatchDrafts(schoolId, batchId);
  }

  @Get()
  async list(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() query: ListInvoicesQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanRead(schoolId, req.user);
    return this.service.list(schoolId, query);
  }

  @Post()
  async createAdhoc(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: CreateAdhocInvoiceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.createAdhoc(schoolId, req.user!.id, dto);
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
    @Body() dto: UpdateDraftInvoiceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.updateDraft(schoolId, id, dto);
  }

  @Post(':id/issue')
  async issue(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.issue(schoolId, req.user!.id, id);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.cancel(schoolId, req.user!.id, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.access.assertCanWrite(schoolId, req.user);
    return this.service.deleteDraft(schoolId, id);
  }
}
