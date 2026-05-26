import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, JwtAuthGuard, RolesGuard],
  exports: [SchoolsService],
})
export class SchoolsModule {}
