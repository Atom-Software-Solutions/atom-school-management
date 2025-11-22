import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AcademicsService } from './academics.service';
import { TermTemplatesController } from './term-templates.controller';
import { YearsController } from './years.controller';

@Module({
  controllers: [TermTemplatesController, YearsController],
  providers: [AcademicsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class AcademicsModule {}
