import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { Response as ExpressResponse } from 'express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  private resolveTenantSchoolId(req: AuthenticatedRequest, providedSchoolId?: string): string {
    const tenantSchoolId = req.user?.school_id as string | undefined;
    if (!tenantSchoolId) {
      throw new BadRequestException('Missing tenant school context');
    }
    if (providedSchoolId && providedSchoolId !== tenantSchoolId) {
      throw new BadRequestException('schoolId does not match authenticated tenant');
    }
    return tenantSchoolId;
  }

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
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      gender?: string;
      status?: string;
      dateOfBirth?: string;
      religion?: string;
      address?: string;
      avatarUrl?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') {
      throw new BadRequestException('Missing required query parameter: schoolId');
    }
    const firstName = (body?.firstName ?? '').toString().trim();
    const lastName = (body?.lastName ?? '').toString().trim();
    const email = body?.email?.toString().trim() || undefined;
    const phone = body?.phone?.toString().trim() || undefined;
    if (!firstName) {
      throw new BadRequestException('Missing required field: firstName');
    }
    if (!lastName) {
      throw new BadRequestException('Missing required field: lastName');
    }
    if (email !== undefined && email !== '') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('email is invalid');
      }
    }
    if (phone !== undefined && phone !== '') {
      if (!/^\d{10}$/.test(phone)) {
        throw new BadRequestException('phone must be a 10-digit number string');
      }
    }

    const gender = body?.gender?.toString().trim() || undefined;
    const status = body?.status?.toString().trim() || undefined;
    const religion = body?.religion?.toString().trim() || undefined;
    const address = body?.address?.toString().trim() || undefined;
    const avatarUrl = body?.avatarUrl?.toString().trim() || undefined;

    const dateOfBirthRaw = body?.dateOfBirth?.toString().trim() || undefined;
    const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined;
    if (dateOfBirthRaw && (!dateOfBirth || Number.isNaN(dateOfBirth.getTime()))) {
      throw new BadRequestException('dateOfBirth must be a valid ISO date string');
    }

    return this.studentsService.create(schoolId, adminUserId, {
      firstName,
      lastName,
      email,
      phone,
      gender,
      status,
      dateOfBirth,
      religion,
      address,
      avatarUrl,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    return this.studentsService.getOne(id, adminUserId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      gender?: string;
      status?: string;
      dateOfBirth?: string;
      religion?: string;
      address?: string;
      avatarUrl?: string;
    },
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
    if (body?.dateOfBirth !== undefined && body.dateOfBirth !== null) {
      const raw = body.dateOfBirth.toString().trim();
      if (raw !== '') {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) {
          throw new BadRequestException('dateOfBirth must be a valid ISO date string');
        }
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

  @Get('import/csv/template')
  downloadCsvTemplate(@Res() res: ExpressResponse) {
    const csv = this.studentsService.generateCsvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_template.csv"');
    return res.send(csv);
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

  @Post('import/csv/validate')
  @UseInterceptors(FileInterceptor('file'))
  validateCsvImport(
    @Query('schoolId') schoolId: string,
    @UploadedFile() file: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') {
      throw new BadRequestException('Missing required query parameter: schoolId');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    return this.studentsService.validateCsvFile(schoolId, adminUserId, file.buffer);
  }

  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsvStudents(
    @Query('schoolId') schoolId: string,
    @UploadedFile() file: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') {
      throw new BadRequestException('Missing required query parameter: schoolId');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    return this.studentsService.importCsvStudents(schoolId, adminUserId, file.buffer);
  }

  @Post(':id/promote')
  promote(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { fromEnrollmentId?: string; toOfferingId?: string; actionDate?: string; narration?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    if (!body?.fromEnrollmentId || !body?.toOfferingId) throw new BadRequestException('Missing fromEnrollmentId/toOfferingId');
    return this.studentsService.promoteStudent(
      id,
      adminUserId,
      tenantSchoolId,
      {
        fromEnrollmentId: body.fromEnrollmentId,
        toOfferingId: body.toOfferingId,
        actionDate: body.actionDate ? new Date(body.actionDate) : undefined,
        narration: body.narration,
      },
    );
  }

  @Post(':id/retain')
  retain(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { fromEnrollmentId?: string; toOfferingId?: string; actionDate?: string; narration?: string; reason?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    if (!body?.fromEnrollmentId || !body?.toOfferingId) throw new BadRequestException('Missing fromEnrollmentId/toOfferingId');
    return this.studentsService.retainStudent(
      id,
      adminUserId,
      tenantSchoolId,
      {
        fromEnrollmentId: body.fromEnrollmentId,
        toOfferingId: body.toOfferingId,
        actionDate: body.actionDate ? new Date(body.actionDate) : undefined,
        narration: body.narration,
        reason: body.reason,
      },
    );
  }

  @Get(':id/enrollments/history')
  history(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Query('yearId') yearId: string,
    @Query('includeInactive') includeInactive: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    const includeInactiveBool = includeInactive === 'true';
    return this.studentsService.getEnrollmentHistory(id, adminUserId, tenantSchoolId, {
      yearId: yearId || undefined,
      includeInactive: includeInactiveBool,
    });
  }

  @Get('enrolled/by-classroom')
  getEnrolledStudentsByClassroom(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    if (!academicYearId || academicYearId.trim() === '') {
      throw new BadRequestException('Missing required query parameter: academicYearId');
    }
    return this.studentsService.getEnrolledStudentsByClassroom(tenantSchoolId, academicYearId, adminUserId);
  }
}
