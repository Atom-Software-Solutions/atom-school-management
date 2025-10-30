import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
    });
    if (!rel) {
      throw new ForbiddenException('Insufficient permissions for this school');
    }
  }

  async listBySchool(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return this.prisma.student.findMany({
      where: { school_id: schoolId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(
    schoolId: string,
    adminUserId: string,
    data: { studentNo: string; regNo?: string; firstName: string; lastName: string; email?: string; phone?: string },
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    try {
      return await this.prisma.student.create({
        data: {
          school_id: schoolId,
          student_no: data.studentNo,
          reg_no: data.regNo || undefined,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002' && Array.isArray(e?.meta?.target)) {
        const target = e.meta.target as string[];
        if (target.includes('student_no')) {
          throw new BadRequestException('A student with this studentNo already exists');
        }
        if (target.includes('reg_no')) {
          throw new BadRequestException('A student with this regNo already exists');
        }
        if (target.includes('email')) {
          throw new BadRequestException('A student with this email already exists');
        }
        if (target.includes('phone')) {
          throw new BadRequestException('A student with this phone already exists');
        }
      }
      throw e;
    }
  }

  private async findOwned(studentId: string, adminUserId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.deleted_at) {
      throw new NotFoundException('Student not found');
    }
    await this.assertIsAdminOfSchool(student.school_id, adminUserId);
    return student;
  }

  async getOne(studentId: string, adminUserId: string) {
    return this.findOwned(studentId, adminUserId);
  }

  async update(studentId: string, adminUserId: string, data: { firstName?: string; lastName?: string; email?: string; phone?: string }) {
    const student = await this.findOwned(studentId, adminUserId);
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    return this.prisma.student.update({ where: { id: student.id }, data: updateData });
  }

  async remove(studentId: string, adminUserId: string) {
    const student = await this.findOwned(studentId, adminUserId);
    await this.prisma.student.update({ where: { id: student.id }, data: { is_active: false, deleted_at: new Date() } });
    return { message: 'Student archived successfully' };
  }

  async listInvoices(studentId: string, adminUserId: string) {
    await this.findOwned(studentId, adminUserId);
    // TODO: Integrate with payment_mgt when schema supports student linkage
    return [];
  }

  async listPayments(studentId: string, adminUserId: string) {
    await this.findOwned(studentId, adminUserId);
    // TODO: Integrate with payment_mgt when schema supports student linkage
    return [];
  }

  async addGuardian(studentId: string, adminUserId: string, data: { firstName: string; lastName: string; email?: string; phone?: string; relation?: string }) {
    const student = await this.findOwned(studentId, adminUserId);
    const guardian = await this.prisma.guardian.create({
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
      },
    });
    await this.prisma.studentGuardian.create({
      data: { student_id: student.id, guardian_id: guardian.id, relation: data.relation },
    });
    return guardian;
  }

  generateImportTemplate(): Buffer {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['studentNo', 'regNo', 'firstName', 'lastName', 'email', 'phone'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private parseWorkbook(buffer: Buffer): Array<{ studentNo: string; regNo?: string; firstName: string; lastName: string; email?: string; phone?: string }>{
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as any[];
    return rows.map((r) => ({
      studentNo: String(r.studentNo || r['studentNo'] || '').trim(),
      regNo: (String(r.regNo || r['regNo'] || '').trim() || undefined),
      firstName: String(r.firstName || r['firstName'] || '').trim(),
      lastName: String(r.lastName || r['lastName'] || '').trim(),
      email: String(r.email || r['email'] || '').trim() || undefined,
      phone: String(r.phone || r['phone'] || '').trim() || undefined,
    }));
  }

  async validateImportFile(schoolId: string, adminUserId: string, buffer: Buffer) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!buffer || buffer.length === 0) {
      return { valid: false, errors: ['No file uploaded'] };
    }
    const rows = this.parseWorkbook(buffer);
    const errors: string[] = [];
    const seen = new Set<string>();
    rows.forEach((row, idx) => {
      const line = idx + 2; // +1 header, +1 1-based
      if (!row.studentNo) errors.push(`Row ${line}: studentNo is required`);
      if (row.studentNo) {
        const key = row.studentNo.toLowerCase();
        if (seen.has(key)) errors.push(`Row ${line}: duplicate studentNo in file`);
        else seen.add(key);
      }
      if (!row.firstName) errors.push(`Row ${line}: firstName is required`);
      if (!row.lastName) errors.push(`Row ${line}: lastName is required`);
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push(`Row ${line}: email is invalid`);
      if (row.phone && !/^\d{10}$/.test(row.phone)) errors.push(`Row ${line}: phone must be 10 digits`);
    });
    return { valid: errors.length === 0, errors, total: rows.length };
  }

  async importStudents(schoolId: string, adminUserId: string, buffer: Buffer) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!buffer || buffer.length === 0) {
      return { imported: 0, errors: ['No file uploaded'] };
    }
    const rows = this.parseWorkbook(buffer);
    const errors: string[] = [];
    let imported = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const line = i + 2;
      if (!row.studentNo) {
        errors.push(`Row ${line}: studentNo is required`);
        continue;
      }
      if (!row.firstName || !row.lastName) {
        errors.push(`Row ${line}: firstName and lastName are required`);
        continue;
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${line}: email is invalid`);
        continue;
      }
      if (row.phone && !/^\d{10}$/.test(row.phone)) {
        errors.push(`Row ${line}: phone must be 10 digits`);
        continue;
      }
      try {
        await this.prisma.student.create({
          data: {
            school_id: schoolId,
            student_no: row.studentNo,
            reg_no: row.regNo || undefined,
            first_name: row.firstName,
            last_name: row.lastName,
            email: row.email,
            phone: row.phone,
          },
        });
        imported += 1;
      } catch (e: any) {
        if (e?.code === 'P2002' && Array.isArray(e?.meta?.target)) {
          const target = e.meta.target as string[];
          if (target.includes('student_no')) {
            errors.push(`Row ${line}: duplicate studentNo`);
          } else if (target.includes('reg_no')) {
            errors.push(`Row ${line}: duplicate regNo`);
          } else if (target.includes('email')) {
            errors.push(`Row ${line}: duplicate email`);
          } else if (target.includes('phone')) {
            errors.push(`Row ${line}: duplicate phone`);
          } else {
            errors.push(`Row ${line}: unique constraint violation`);
          }
        } else {
          errors.push(`Row ${line}: ${e?.message || 'failed to insert'}`);
        }
      }
    }
    return { imported, failed: rows.length - imported, errors };
  }
}
