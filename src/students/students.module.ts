import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, JwtAuthGuard, RolesGuard],
  exports: [StudentsService],
})
export class StudentsModule { }
