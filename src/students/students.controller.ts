import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { Response as ExpressResponse } from 'express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

interface AuthenticatedRequest extends Request {
  user: any;
}

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(@Query('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      throw new BadRequestException('Missing required query parameter: schoolId');
    }
    return this.studentsService.listBySchool(schoolId, adminUserId);
  }

  @Post()
  create(
    @Query('schoolId') schoolId: string,
    @Body() body: { studentNo: string; regNo?: string; firstName: string; lastName: string; email?: string; phone?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') {
      throw new BadRequestException('Missing required query parameter: schoolId');
    }
    const studentNo = (body?.studentNo ?? '').toString().trim();
    const regNo = body?.regNo?.toString().trim() || undefined;
    const firstName = (body?.firstName ?? '').toString().trim();
    const lastName = (body?.lastName ?? '').toString().trim();
    const email = body?.email?.toString().trim() || undefined;
    const phone = body?.phone?.toString().trim() || undefined;
    if (!studentNo) {
      throw new BadRequestException('Missing required field: studentNo');
    }
    if (!firstName) {
      throw new BadRequestException('Missing required field: firstName');
    }
    if (!lastName) {
      throw new BadRequestException('Missing required field: lastName');
    }
    if (phone !== undefined && phone !== '') {
      if (!/^\d{10}$/.test(phone)) {
        throw new BadRequestException('phone must be a 10-digit number string');
      }
    }
    return this.studentsService.create(schoolId, adminUserId, { studentNo, regNo, firstName, lastName, email, phone });
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.getOne(id, adminUserId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { firstName?: string; lastName?: string; email?: string; phone?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.update(id, adminUserId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.remove(id, adminUserId);
  }

  @Get(':id/invoices')
  listInvoices(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.listInvoices(id, adminUserId);
  }

  @Get(':id/payments')
  listPayments(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.listPayments(id, adminUserId);
  }

  @Post(':id/guardians')
  addGuardian(
    @Param('id') id: string,
    @Body() body: { firstName: string; lastName: string; email?: string; phone?: string; relation?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.addGuardian(id, adminUserId, body);
  }

  @Get('import/template')
  downloadTemplate(@Res() res: ExpressResponse) {
    const buffer = this.studentsService.generateImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="students_template.xlsx"');
    return res.send(buffer);
  }

  @Post('import/validate')
  @UseInterceptors(FileInterceptor('file'))
  validateImport(
    @Body() body: { schoolId: string },
    @UploadedFile() file: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.validateImportFile(body.schoolId, adminUserId, file?.buffer || Buffer.alloc(0));
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importStudents(
    @Body() body: { schoolId: string },
    @UploadedFile() file: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.importStudents(body.schoolId, adminUserId, file?.buffer || Buffer.alloc(0));
  }
}
