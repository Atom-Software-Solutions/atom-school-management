import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}
  async verifyAdminOfSchool(schoolId: string, userId: string) {
    await this.assertIsAdminOfSchool(schoolId, userId);
  }

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
    try {
      return await this.prisma.student.update({ where: { id: student.id }, data: updateData });
    } catch (e: any) {
      if (e?.code === 'P2002' && Array.isArray(e?.meta?.target)) {
        const target = e.meta.target as string[];
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

  async updateIdentifiers(studentId: string, adminUserId: string, data: { studentNo?: string; regNo?: string }) {
    const student = await this.findOwned(studentId, adminUserId);
    const updateData: any = {};
    if (data.studentNo !== undefined) updateData.student_no = data.studentNo;
    if (data.regNo !== undefined) updateData.reg_no = data.regNo;
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Provide studentNo and/or regNo');
    }
    try {
      return await this.prisma.student.update({ where: { id: student.id }, data: updateData });
    } catch (e: any) {
      if (e?.code === 'P2002' && Array.isArray(e?.meta?.target)) {
        const target = e.meta.target as string[];
        if (target.includes('student_no')) {
          throw new BadRequestException('A student with this studentNo already exists');
        }
        if (target.includes('reg_no')) {
          throw new BadRequestException('A student with this regNo already exists');
        }
      }
      throw e;
    }
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
      ['studentNo', 'regNo', 'firstName', 'lastName', 'email', 'phone', 'className'],
    ]);
    // Freeze header row
    (worksheet as any)['!freeze'] = { xSplit: 0, ySplit: 1 };
    // Make header read-only by protecting sheet and unlocking data rows
    const cols = ['A','B','C','D','E','F','G'];
    const maxRows = 1000; // editable rows to guide users
    for (let r = 2; r <= maxRows + 1; r += 1) {
      for (let c = 0; c < cols.length; c += 1) {
        const ref = `${cols[c]}${r}`;
        (worksheet as any)[ref] = (worksheet as any)[ref] || { v: '', t: 's' };
        // Attempt to mark data cells as unlocked so only header stays locked
        (worksheet as any)[ref].s = { protection: { locked: false } } as any;
      }
    }
    (worksheet as any)['!ref'] = `A1:G${maxRows + 1}`;
    (worksheet as any)['!protect'] = { password: 'upload', selectLockedCells: true, selectUnlockedCells: true } as any;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private parseWorkbook(buffer: Buffer): Array<{ studentNo: string; regNo?: string; firstName: string; lastName: string; email?: string; phone?: string; className?: string }>{
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
      className: String(r.className || r['className'] || '').trim() || undefined,
    }));
  }

  async validateImportFile(schoolId: string, adminUserId: string, buffer: Buffer) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!buffer || buffer.length === 0) {
      return { valid: false, errors: ['No file uploaded'] };
    }
    const rows = this.parseWorkbook(buffer);
    const errors: string[] = [];
    // Load existing values in this school for uniqueness checks
    const existing = await this.prisma.student.findMany({
      where: { school_id: schoolId },
      select: { student_no: true, reg_no: true, email: true, phone: true },
    });
    const existingStudentNos = new Set<string>(existing.map(e => e.student_no).filter(Boolean) as string[]);
    const existingRegNos = new Set<string>(existing.map(e => e.reg_no!).filter(Boolean) as string[]);
    const existingEmails = new Set<string>(existing.map(e => (e.email || '').toLowerCase()).filter(v => v));
    const existingPhones = new Set<string>(existing.map(e => e.phone!).filter(Boolean) as string[]);

    // Track duplicates inside the file
    const fileStudentNos = new Set<string>();
    const fileRegNos = new Set<string>();
    const fileEmails = new Set<string>();
    const filePhones = new Set<string>();

    rows.forEach((row, idx) => {
      const line = idx + 2; // +1 header, +1 1-based
      if (!row.studentNo) errors.push(`Row ${line}: studentNo is required`);
      if (row.studentNo) {
        const key = row.studentNo;
        if (fileStudentNos.has(key)) errors.push(`Row ${line}: duplicate studentNo in file`);
        else fileStudentNos.add(key);
        if (existingStudentNos.has(key)) errors.push(`Row ${line}: studentNo already exists for this school`);
      }
      if (!row.firstName) errors.push(`Row ${line}: firstName is required`);
      if (!row.lastName) errors.push(`Row ${line}: lastName is required`);
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push(`Row ${line}: email is invalid`);
      if (row.phone && !/^\d{10}$/.test(row.phone)) errors.push(`Row ${line}: phone must be 10 digits`);
      if (row.regNo) {
        if (fileRegNos.has(row.regNo)) errors.push(`Row ${line}: duplicate regNo in file`);
        else fileRegNos.add(row.regNo);
        if (existingRegNos.has(row.regNo)) errors.push(`Row ${line}: regNo already exists for this school`);
      }
      if (row.email) {
        const ekey = row.email.toLowerCase();
        if (fileEmails.has(ekey)) errors.push(`Row ${line}: duplicate email in file`);
        else fileEmails.add(ekey);
        if (existingEmails.has(ekey)) errors.push(`Row ${line}: email already exists for this school`);
      }
      if (row.phone) {
        if (filePhones.has(row.phone)) errors.push(`Row ${line}: duplicate phone in file`);
        else filePhones.add(row.phone);
        if (existingPhones.has(row.phone)) errors.push(`Row ${line}: phone already exists for this school`);
      }
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
    // Load existing values for school-wide uniqueness, and update as we import
    const existing = await this.prisma.student.findMany({
      where: { school_id: schoolId },
      select: { student_no: true, reg_no: true, email: true, phone: true },
    });
    const studentNos = new Set<string>(existing.map(e => e.student_no).filter(Boolean) as string[]);
    const regNos = new Set<string>(existing.map(e => e.reg_no!).filter(Boolean) as string[]);
    const emails = new Set<string>(existing.map(e => (e.email || '').toLowerCase()).filter(v => v));
    const phones = new Set<string>(existing.map(e => e.phone!).filter(Boolean) as string[]);
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
      // Uniqueness against already-imported and existing DB records for this school
      if (studentNos.has(row.studentNo)) {
        errors.push(`Row ${line}: studentNo already exists for this school`);
        continue;
      }
      if (row.regNo && regNos.has(row.regNo)) {
        errors.push(`Row ${line}: regNo already exists for this school`);
        continue;
      }
      if (row.email && emails.has(row.email.toLowerCase())) {
        errors.push(`Row ${line}: email already exists for this school`);
        continue;
      }
      if (row.phone && phones.has(row.phone)) {
        errors.push(`Row ${line}: phone already exists for this school`);
        continue;
      }
      try {
        let classroomId: string | undefined = undefined;
        if (row.className) {
          const cls = await this.prisma.classroom.upsert({
            where: { school_id_name: { school_id: schoolId, name: row.className } },
            create: { school_id: schoolId, name: row.className },
            update: {},
          });
          classroomId = cls.id;
        }
        await this.prisma.student.create({
          data: {
            school_id: schoolId,
            class_id: classroomId,
            student_no: row.studentNo,
            reg_no: row.regNo || undefined,
            first_name: row.firstName,
            last_name: row.lastName,
            email: row.email,
            phone: row.phone,
          },
        });
        imported += 1;
        // Update sets so subsequent rows are checked against new inserts
        studentNos.add(row.studentNo);
        if (row.regNo) regNos.add(row.regNo);
        if (row.email) emails.add(row.email.toLowerCase());
        if (row.phone) phones.add(row.phone);
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
