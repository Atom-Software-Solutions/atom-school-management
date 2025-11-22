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
    if (body?.phone !== undefined && body.phone !== null) {
      const phone = body.phone.toString().trim();
      if (phone !== '' && !/^\d{10}$/.test(phone)) {
        throw new BadRequestException('phone must be a 10-digit number string');
      }
    }
    if (body?.email !== undefined && body.email !== null) {
      const email = body.email.toString().trim();
      if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('email is invalid');
      }
    }
    return this.studentsService.update(id, adminUserId, body);
  }

  @Patch(':id/identifiers')
  updateIdentifiers(
    @Param('id') id: string,
    @Body() body: { studentNo?: string; regNo?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    const studentNo = body?.studentNo?.toString().trim();
    const regNo = body?.regNo?.toString().trim();
    if (!studentNo && !regNo) {
      throw new BadRequestException('Provide studentNo and/or regNo');
    }
    return this.studentsService.updateIdentifiers(id, adminUserId, { studentNo, regNo });
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
    @Query('schoolId') schoolId: string,
    @UploadedFile() file: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') {
      throw new BadRequestException('Missing required query parameter: schoolId');
    }
    const buffer = file?.buffer || Buffer.alloc(0);
    return this.studentsService
      .validateImportFile(schoolId, adminUserId, buffer)
      .then(async (result) => {
        if (result.valid) {
          // Auto-import on successful validation
          const importResult = await this.studentsService.importStudents(
            schoolId,
            adminUserId,
            buffer,
          );
          return { ...result, ...importResult };
        }
        return result;
      });
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importStudents(
    @Query('schoolId') schoolId: string,
    @UploadedFile() file: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') {
      throw new BadRequestException('Missing required query parameter: schoolId');
    }
    return this.studentsService.importStudents(schoolId, adminUserId, file?.buffer || Buffer.alloc(0));
  }

  @Post(':id/promote')
  promote(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { fromEnrollmentId?: string; toOfferingId?: string; endDate?: string; startDate?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') throw new BadRequestException('Missing required query parameter: schoolId');
    if (!body?.fromEnrollmentId || !body?.toOfferingId) throw new BadRequestException('Missing fromEnrollmentId/toOfferingId');
    return this.studentsService.promoteStudent(
      id,
      adminUserId,
      schoolId,
      {
        fromEnrollmentId: body.fromEnrollmentId,
        toOfferingId: body.toOfferingId,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
      },
    );
  }

  @Post(':id/retain')
  retain(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { fromEnrollmentId?: string; toOfferingId?: string; endDate?: string; startDate?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') throw new BadRequestException('Missing required query parameter: schoolId');
    if (!body?.fromEnrollmentId || !body?.toOfferingId) throw new BadRequestException('Missing fromEnrollmentId/toOfferingId');
    return this.studentsService.retainStudent(
      id,
      adminUserId,
      schoolId,
      {
        fromEnrollmentId: body.fromEnrollmentId,
        toOfferingId: body.toOfferingId,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
      },
    );
  }
}
