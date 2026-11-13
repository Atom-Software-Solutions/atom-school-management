import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BillingAccessService } from './billing-access.service';
import { BillingOptionsController } from './billing-options.controller';
import { BillingReportsController } from './billing-reports.controller';
import { BillingReportsService } from './billing-reports.service';
import { FeeAssignmentsController } from './fee-assignments.controller';
import { FeeAssignmentsService } from './fee-assignments.service';
import { FeeCategoriesController } from './fee-categories.controller';
import { FeeCategoriesService } from './fee-categories.service';
import { FeeStructuresController } from './fee-structures.controller';
import { FeeStructuresService } from './fee-structures.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { NumberingService } from './numbering.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [
    BillingOptionsController,
    FeeCategoriesController,
    FeeStructuresController,
    FeeAssignmentsController,
    InvoicesController,
    PaymentsController,
    BillingReportsController,
  ],
  providers: [
    BillingAccessService,
    FeeCategoriesService,
    FeeStructuresService,
    FeeAssignmentsService,
    InvoicesService,
    NumberingService,
    PaymentsService,
    BillingReportsService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [BillingAccessService, FeeCategoriesService, FeeStructuresService, FeeAssignmentsService, InvoicesService, PaymentsService, BillingReportsService],
})
export class BillingModule {}
