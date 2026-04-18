import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, PrismaService, JwtAuthGuard, RolesGuard],
  exports: [SchoolsService],
})
export class SchoolsModule {}
