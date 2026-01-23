import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

// File validation constants
const MAX_FILE_SIZE = parseInt(process.env.MAX_IMPORT_FILE_SIZE || '5242880'); // 5MB default
const ALLOWED_MIME_TYPES = ['text/csv', 'application/csv', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.csv'];

// File validation helper
interface FileValidationResult {
  valid: boolean;
  error?: string;
}

function validateFileSize(buffer: Buffer): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'No file uploaded' };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    const maxSizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024);
    return { valid: false, error: `File size exceeds maximum of ${maxSizeMB}MB` };
  }
  return { valid: true };
}

function validateFileType(mimeType: string | undefined, originalName: string | undefined): FileValidationResult {
  if (!originalName) {
    return { valid: false, error: 'File name is required' };
  }
  const extension = originalName.toLowerCase().substring(originalName.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Invalid file type. Must be CSV` };
  }
  return { valid: true };
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}
  async verifyAdminOfSchool(schoolId: string, userId: string) {
    await this.assertIsAdminOfSchool(schoolId, userId);
  }

  private nextCode(prefix: string, seq: number, minDigits = 3) {
    const digits = Math.max(minDigits, String(seq).length);
    return `${prefix}${String(seq).padStart(digits, '0')}`;
  }

  private async generateNextStudentNo(schoolId: string): Promise<string> {
    const students = await this.prisma.student.findMany({
      where: { school_id: schoolId },
      select: { student_no: true },
    });
    let max = 0;
    for (const s of students) {
      const m = /^STU(\d+)$/.exec((s.student_no || '').trim());
      if (m) max = Math.max(max, Number(m[1]));
    }
    return this.nextCode('STU', max + 1, 3);
  }

  private async generateNextRegNo(schoolId: string): Promise<string> {
    const students = await this.prisma.student.findMany({
      where: { school_id: schoolId, reg_no: { not: null } },
      select: { reg_no: true },
    });
    let max = 0;
    for (const s of students) {
      const m = /^REG(\d+)$/.exec((s.reg_no || '').trim());
      if (m) max = Math.max(max, Number(m[1]));
    }
    return this.nextCode('REG', max + 1, 3);
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
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      gender?: string;
      status?: string;
      dateOfBirth?: Date;
      religion?: string;
      address?: string;
      avatarUrl?: string;
    },
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Autogenerate studentNo/regNo with retry on unique constraints (concurrent requests)
    let attempt = 0;
    const maxAttempts = 5;
    while (attempt < maxAttempts) {
      attempt += 1;
      const studentNo = await this.generateNextStudentNo(schoolId);
      const regNo = await this.generateNextRegNo(schoolId);
      try {
        return await this.prisma.student.create({
          data: {
            school_id: schoolId,
            student_no: studentNo,
            reg_no: regNo,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            gender: data.gender,
            status: data.status,
            date_of_birth: data.dateOfBirth,
            religion: data.religion,
            address: data.address,
            avatar_url: data.avatarUrl,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002' && Array.isArray(e?.meta?.target)) {
          const target = e.meta.target as string[];
          if (target.includes('student_no') || target.includes('reg_no')) {
            // collision - retry with next sequence
            continue;
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
    throw new BadRequestException('Failed to generate unique student identifiers. Please retry.');
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

  async update(
    studentId: string,
    adminUserId: string,
    data: {
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
  ) {
    const student = await this.findOwned(studentId, adminUserId);
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.religion !== undefined) updateData.religion = data.religion;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
    if (data.dateOfBirth !== undefined) {
      const raw = (data.dateOfBirth ?? '').toString().trim();
      updateData.date_of_birth = raw ? new Date(raw) : null;
    }
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
          throw new BadRequestException('A student with this studentNo already exists in this school');
        }
        if (target.includes('reg_no')) {
          throw new BadRequestException('A student with this regNo already exists in this school');
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
        school_id: student.school_id, // Set tenant context from student
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
      ['firstName', 'lastName', 'email', 'phone', 'gender', 'status', 'dateOfBirth', 'religion', 'address', 'className'],
    ]);
    // Freeze header row
    (worksheet as any)['!freeze'] = { xSplit: 0, ySplit: 1 };
    // Make header read-only by protecting sheet and unlocking data rows
    const cols = ['A','B','C','D','E','F','G','H','I','J'];
    const maxRows = 1000; // editable rows to guide users
    for (let r = 2; r <= maxRows + 1; r += 1) {
      for (let c = 0; c < cols.length; c += 1) {
        const ref = `${cols[c]}${r}`;
        (worksheet as any)[ref] = (worksheet as any)[ref] || { v: '', t: 's' };
        // Attempt to mark data cells as unlocked so only header stays locked
        (worksheet as any)[ref].s = { protection: { locked: false } } as any;
      }
    }
    (worksheet as any)['!ref'] = `A1:J${maxRows + 1}`;
    (worksheet as any)['!protect'] = { password: 'upload', selectLockedCells: true, selectUnlockedCells: true } as any;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  generateCsvTemplate(): string {
    return 'firstName,lastName,email,phone,gender,status,dateOfBirth,religion,address,className\n';
  }

  private parseCsv(buffer: Buffer): Array<{ firstName: string; lastName: string; email?: string; phone?: string; gender?: string; status?: string; dateOfBirth?: string; religion?: string; address?: string; className?: string }> {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const headerMap: Record<string, number> = {};
    header.forEach((h, idx) => {
      headerMap[h.toLowerCase()] = idx;
    });
    
    // Parse data rows
    const rows: Array<{ firstName: string; lastName: string; email?: string; phone?: string; gender?: string; status?: string; dateOfBirth?: string; religion?: string; address?: string; className?: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: any = {};
      if (headerMap['firstname'] !== undefined) row.firstName = (values[headerMap['firstname']] || '').trim();
      if (headerMap['lastname'] !== undefined) row.lastName = (values[headerMap['lastname']] || '').trim();
      if (headerMap['email'] !== undefined) row.email = (values[headerMap['email']] || '').trim() || undefined;
      if (headerMap['phone'] !== undefined) row.phone = (values[headerMap['phone']] || '').trim() || undefined;
      if (headerMap['gender'] !== undefined) row.gender = (values[headerMap['gender']] || '').trim() || undefined;
      if (headerMap['status'] !== undefined) row.status = (values[headerMap['status']] || '').trim() || undefined;
      if (headerMap['dateofbirth'] !== undefined) row.dateOfBirth = (values[headerMap['dateofbirth']] || '').trim() || undefined;
      if (headerMap['religion'] !== undefined) row.religion = (values[headerMap['religion']] || '').trim() || undefined;
      if (headerMap['address'] !== undefined) row.address = (values[headerMap['address']] || '').trim() || undefined;
      if (headerMap['classname'] !== undefined) row.className = (values[headerMap['classname']] || '').trim() || undefined;
      rows.push(row);
    }
    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private parseWorkbook(buffer: Buffer): Array<{ firstName: string; lastName: string; email?: string; phone?: string; gender?: string; status?: string; dateOfBirth?: string; religion?: string; address?: string; className?: string }>{
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as any[];
    return rows.map((r) => ({
      firstName: String(r.firstName || r['firstName'] || '').trim(),
      lastName: String(r.lastName || r['lastName'] || '').trim(),
      email: String(r.email || r['email'] || '').trim() || undefined,
      phone: String(r.phone || r['phone'] || '').trim() || undefined,
      gender: String(r.gender || r['gender'] || '').trim() || undefined,
      status: String(r.status || r['status'] || '').trim() || undefined,
      dateOfBirth: String(r.dateOfBirth || r['dateOfBirth'] || '').trim() || undefined,
      religion: String(r.religion || r['religion'] || '').trim() || undefined,
      address: String(r.address || r['address'] || '').trim() || undefined,
      className: String(r.className || r['className'] || '').trim() || undefined,
    }));
  }

  async validateImportFile(schoolId: string, adminUserId: string, buffer: Buffer) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!buffer || buffer.length === 0) {
      return { valid: false, errors: ['No file uploaded'], total: 0 };
    }
    let rows;
    try {
      rows = this.parseWorkbook(buffer);
    } catch (e: any) {
      return { valid: false, errors: [`File parsing error: ${e?.message || 'Failed to parse file'}`], total: 0 };
    }
    const errors: string[] = [];
    // Load existing values in this school for uniqueness checks
    const existing = await this.prisma.student.findMany({
      where: { school_id: schoolId },
      select: { email: true, phone: true },
    });
    const existingEmails = new Set<string>(existing.map(e => (e.email || '').toLowerCase()).filter(v => v));
    const existingPhones = new Set<string>(existing.map(e => e.phone!).filter(Boolean) as string[]);

    // Track duplicates inside the file
    const fileEmails = new Set<string>();
    const filePhones = new Set<string>();

    rows.forEach((row, idx) => {
      const line = idx + 2; // +1 header, +1 1-based
      if (!row.firstName) errors.push(`Row ${line}: firstName is required`);
      if (!row.lastName) errors.push(`Row ${line}: lastName is required`);
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push(`Row ${line}: email is invalid`);
      if (row.phone && !/^\d{10}$/.test(row.phone)) errors.push(`Row ${line}: phone must be 10 digits`);
      if (row.dateOfBirth) {
        const dob = new Date(row.dateOfBirth);
        if (isNaN(dob.getTime())) {
          errors.push(`Row ${line}: dateOfBirth must be a valid date (YYYY-MM-DD)`);
        }
      }
      if (row.email) {
        const ekey = row.email.toLowerCase();
        if (fileEmails.has(ekey)) errors.push(`Row ${line}: duplicate email in file`);
        else fileEmails.add(ekey);
        if (existingEmails.has(ekey)) errors.push(`Row ${line}: email already exists`);
      }
      if (row.phone) {
        if (filePhones.has(row.phone)) errors.push(`Row ${line}: duplicate phone in file`);
        else filePhones.add(row.phone);
        if (existingPhones.has(row.phone)) errors.push(`Row ${line}: phone already exists for this school`);
      }
    });
    return {
      valid: errors.length === 0,
      errors,
      total: rows.length,
      processed: rows.length,
      failed: errors.length > 0 ? rows.length : 0,
    };
  }

  async validateCsvFile(schoolId: string, adminUserId: string, buffer: Buffer) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!buffer || buffer.length === 0) {
      return { valid: false, errors: ['No file uploaded'], total: 0 };
    }
    let rows;
    try {
      rows = this.parseCsv(buffer);
    } catch (e: any) {
      return { valid: false, errors: [`CSV parsing error: ${e?.message || 'Failed to parse CSV'}`], total: 0 };
    }
    const errors: string[] = [];
    // Load existing values in this school for uniqueness checks
    const existing = await this.prisma.student.findMany({
      where: { school_id: schoolId },
      select: { email: true, phone: true },
    });
    const existingEmails = new Set<string>(existing.map(e => (e.email || '').toLowerCase()).filter(v => v));
    const existingPhones = new Set<string>(existing.map(e => e.phone!).filter(Boolean) as string[]);

    // Track duplicates inside the file
    const fileStudentNos = new Set<string>();
    const fileRegNos = new Set<string>();
    const fileEmails = new Set<string>();
    const filePhones = new Set<string>();

    rows.forEach((row, idx) => {
      const line = idx + 2; // +1 header, +1 1-based
      // if (!row.studentNo) errors.push(`Row ${line}: studentNo is required`);
      // if (row.studentNo) {
      //   const key = row.studentNo;
      //   if (fileStudentNos.has(key)) errors.push(`Row ${line}: duplicate studentNo in file`);
      //   else fileStudentNos.add(key);
      //   if (existingStudentNos.has(key)) errors.push(`Row ${line}: studentNo already exists for this school`);
      // }
      if (!row.firstName) errors.push(`Row ${line}: firstName is required`);
      if (!row.lastName) errors.push(`Row ${line}: lastName is required`);
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push(`Row ${line}: email is invalid`);
      if (row.phone && !/^\d{10}$/.test(row.phone)) errors.push(`Row ${line}: phone must be 10 digits`);
      if (row.dateOfBirth) {
        const dob = new Date(row.dateOfBirth);
        if (isNaN(dob.getTime())) {
          errors.push(`Row ${line}: dateOfBirth must be a valid date (YYYY-MM-DD)`);
        }
      }
      // if (row.regNo) {
      //   if (fileRegNos.has(row.regNo)) errors.push(`Row ${line}: duplicate regNo in file`);
      //   else fileRegNos.add(row.regNo);
      //   if (existingRegNos.has(row.regNo)) errors.push(`Row ${line}: regNo already exists for this school`);
      // }
      if (row.email) {
        const ekey = row.email.toLowerCase();
        if (fileEmails.has(ekey)) errors.push(`Row ${line}: duplicate email in file`);
        else fileEmails.add(ekey);
        if (existingEmails.has(ekey)) errors.push(`Row ${line}: email already exists`);
      }
      if (row.phone) {
        if (filePhones.has(row.phone)) errors.push(`Row ${line}: duplicate phone in file`);
        else filePhones.add(row.phone);
        if (existingPhones.has(row.phone)) errors.push(`Row ${line}: phone already exists for this school`);
      }
    });
    return {
      valid: errors.length === 0,
      errors,
      total: rows.length,
      processed: rows.length,
      failed: errors.length > 0 ? rows.length : 0,
    };
  }

  async importStudents(schoolId: string, adminUserId: string, buffer: Buffer) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!buffer || buffer.length === 0) {
      return { imported: 0, failed: 0, errors: ['No file uploaded'], total: 0 };
    }
    let rows;
    try {
      rows = this.parseWorkbook(buffer);
    } catch (e: any) {
      return { imported: 0, failed: 0, errors: [`File parsing error: ${e?.message || 'Failed to parse file'}`], total: 0 };
    }
    const errors: string[] = [];
    let imported = 0;
    // Load existing values for school-wide uniqueness, and update as we import
    const existing = await this.prisma.student.findMany({
      where: { school_id: schoolId },
      select: { email: true, phone: true },
    });
    const emails = new Set<string>(existing.map(e => (e.email || '').toLowerCase()).filter(v => v));
    const phones = new Set<string>(existing.map(e => e.phone!).filter(Boolean) as string[]);
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const line = i + 2;
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
      if (row.dateOfBirth) {
        const dob = new Date(row.dateOfBirth);
        if (isNaN(dob.getTime())) {
          errors.push(`Row ${line}: dateOfBirth must be a valid date (YYYY-MM-DD)`);
          continue;
        }
      }
      // Uniqueness against already-imported and existing DB records for this school
      if (row.email && emails.has(row.email.toLowerCase())) {
        errors.push(`Row ${line}: email already exists`);
        continue;
      }
      if (row.phone && phones.has(row.phone)) {
        errors.push(`Row ${line}: phone already exists`);
        continue;
      }
      try {
        // Auto-generate studentNo and regNo
        let studentNo = await this.generateNextStudentNo(schoolId);
        let regNo = await this.generateNextRegNo(schoolId);
        
        // Retry on unique constraint violations for studentNo/regNo
        let attempt = 0;
        const maxAttempts = 5;
        let student;
        while (attempt < maxAttempts) {
          attempt += 1;
          try {
            const dateOfBirth = row.dateOfBirth ? new Date(row.dateOfBirth) : undefined;
            student = await this.prisma.student.create({
              data: {
                school_id: schoolId,
                student_no: studentNo,
                reg_no: regNo,
                first_name: row.firstName,
                last_name: row.lastName,
                email: row.email,
                phone: row.phone,
                gender: row.gender,
                status: row.status,
                date_of_birth: dateOfBirth,
                religion: row.religion,
                address: row.address,
              },
            });
            break; // Success, exit retry loop
          } catch (e: any) {
            if (e?.code === 'P2002' && Array.isArray(e?.meta?.target)) {
              const target = e.meta.target as string[];
              if (target.includes('student_no') || target.includes('reg_no')) {
                // Regenerate and retry
                studentNo = await this.generateNextStudentNo(schoolId);
                regNo = await this.generateNextRegNo(schoolId);
                if (attempt < maxAttempts) {
                  continue;
                }
                // Max attempts reached
                break;
              }
              if (target.includes('email')) {
                errors.push(`Row ${line}: email already exists`);
                break;
              }
              if (target.includes('phone')) {
                errors.push(`Row ${line}: phone already exists`);
                break;
              }
            }
            throw e;
          }
        }
        
        if (!student) {
          errors.push(`Row ${line}: Failed to generate unique student identifiers. Please retry.`);
          continue;
        }
        
        // If className is provided, create enrollment in new system
        if (row.className) {
          try {
            // Find or create ClassroomDefinition
            let definition = await (this.prisma as any).classroomDefinition.findUnique({
              where: { school_id_name: { school_id: schoolId, name: row.className.trim() } },
            });
            
            if (!definition) {
              definition = await (this.prisma as any).classroomDefinition.create({
                data: {
                  school_id: schoolId,
                  name: row.className.trim(),
                },
              });
            }
            
            // Get the active academic year (or most recent if none active)
            const activeYear = await (this.prisma as any).academicYear.findFirst({
              where: {
                school_id: schoolId,
                status: 'active',
              },
              orderBy: { start_date: 'desc' },
            });
            
            // If no active year, get the most recent year
            const academicYear = activeYear || await (this.prisma as any).academicYear.findFirst({
              where: { school_id: schoolId },
              orderBy: { start_date: 'desc' },
            });
            
            if (academicYear) {
              // Find or create ClassroomOffering
              let offering = await (this.prisma as any).classroomOffering.findUnique({
                where: {
                  academic_year_id_classroom_definition_id: {
                    academic_year_id: academicYear.id,
                    classroom_definition_id: definition.id,
                  },
                },
              });
              
              if (!offering) {
                offering = await (this.prisma as any).classroomOffering.create({
                  data: {
                    academic_year_id: academicYear.id,
                    classroom_definition_id: definition.id,
                    is_active: true,
                  },
                });
              }
              
              // Check for existing active enrollment in this academic year
              const existingEnrollment = await (this.prisma as any).studentEnrollment.findFirst({
                where: {
                  student_id: student.id,
                  academic_year_id: academicYear.id,
                  end_date: null, // Active enrollment
                },
              });
              
              if (!existingEnrollment) {
                // Create StudentEnrollment only if one doesn't already exist
                await (this.prisma as any).studentEnrollment.create({
                  data: {
                    student_id: student.id,
                    classroom_offering_id: offering.id,
                    academic_year_id: academicYear.id,
                    start_date: new Date(),
                    status: 'active',
                  },
                });
              } else {
                // Enrollment already exists - log info but don't fail
                console.log(`Student ${student.id} already has an active enrollment in academic year ${academicYear.id}`);
              }
            } else {
              // No academic year found - log warning but don't fail import
              errors.push(`Row ${line}: className "${row.className}" specified but no academic year found for school. Student imported without enrollment.`);
            }
          } catch (enrollmentError: any) {
            // Log enrollment error but don't fail the student import
            errors.push(`Row ${line}: Failed to create enrollment for className "${row.className}": ${enrollmentError.message}`);
          }
        }
        
        imported += 1;
        // Update sets so subsequent rows are checked against new inserts
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
    return {
      imported,
      failed: rows.length - imported,
      errors,
      total: rows.length,
      processed: rows.length,
    };
  }

  async importCsvStudents(schoolId: string, adminUserId: string, buffer: Buffer) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!buffer || buffer.length === 0) {
      return { imported: 0, failed: 0, errors: ['No file uploaded'], total: 0 };
    }
    let rows;
    try {
      rows = this.parseCsv(buffer);
    } catch (e: any) {
      return { imported: 0, failed: 0, errors: [`CSV parsing error: ${e?.message || 'Failed to parse CSV'}`], total: 0 };
    }
    const errors: string[] = [];
    let imported = 0;
    // Load existing values for school-wide uniqueness, and update as we import
    const existing = await this.prisma.student.findMany({
      where: { school_id: schoolId },
      select: { email: true, phone: true },
    });
    const emails = new Set<string>(existing.map(e => (e.email || '').toLowerCase()).filter(v => v));
    const phones = new Set<string>(existing.map(e => e.phone!).filter(Boolean) as string[]);
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const line = i + 2;
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
      if (row.dateOfBirth) {
        const dob = new Date(row.dateOfBirth);
        if (isNaN(dob.getTime())) {
          errors.push(`Row ${line}: dateOfBirth must be a valid date (YYYY-MM-DD)`);
          continue;
        }
      }
      // Uniqueness against already-imported and existing DB records for this school
      if (row.email && emails.has(row.email.toLowerCase())) {
        errors.push(`Row ${line}: email already exists`);
        continue;
      }
      if (row.phone && phones.has(row.phone)) {
        errors.push(`Row ${line}: phone already exists`);
        continue;
      }
      try {
        // Auto-generate studentNo and regNo
        let studentNo = await this.generateNextStudentNo(schoolId);
        let regNo = await this.generateNextRegNo(schoolId);
        
        // Retry on unique constraint violations for studentNo/regNo
        let attempt = 0;
        const maxAttempts = 5;
        let student;
        while (attempt < maxAttempts) {
          attempt += 1;
          try {
            const dateOfBirth = row.dateOfBirth ? new Date(row.dateOfBirth) : undefined;
            student = await this.prisma.student.create({
              data: {
                school_id: schoolId,
                student_no: studentNo,
                reg_no: regNo,
                first_name: row.firstName,
                last_name: row.lastName,
                email: row.email,
                phone: row.phone,
                gender: row.gender,
                status: row.status,
                date_of_birth: dateOfBirth,
                religion: row.religion,
                address: row.address,
              },
            });
            break; // Success, exit retry loop
          } catch (e: any) {
            if (e?.code === 'P2002' && Array.isArray(e?.meta?.target)) {
              const target = e.meta.target as string[];
              if (target.includes('student_no') || target.includes('reg_no')) {
                // Regenerate and retry
                studentNo = await this.generateNextStudentNo(schoolId);
                regNo = await this.generateNextRegNo(schoolId);
                if (attempt < maxAttempts) {
                  continue;
                }
                // Max attempts reached
                break;
              }
              if (target.includes('email')) {
                errors.push(`Row ${line}: email already exists`);
                break;
              }
              if (target.includes('phone')) {
                errors.push(`Row ${line}: phone already exists`);
                break;
              }
            }
            throw e;
          }
        }
        
        if (!student) {
          errors.push(`Row ${line}: Failed to generate unique student identifiers. Please retry.`);
          continue;
        }
        
        // If className is provided, create enrollment in new system
        if (row.className) {
          try {
            // Find or create ClassroomDefinition
            let definition = await (this.prisma as any).classroomDefinition.findUnique({
              where: { school_id_name: { school_id: schoolId, name: row.className.trim() } },
            });
            
            if (!definition) {
              definition = await (this.prisma as any).classroomDefinition.create({
                data: {
                  school_id: schoolId,
                  name: row.className.trim(),
                },
              });
            }
            
            // Get the active academic year (or most recent if none active)
            const activeYear = await (this.prisma as any).academicYear.findFirst({
              where: {
                school_id: schoolId,
                status: 'active',
              },
              orderBy: { start_date: 'desc' },
            });
            
            // If no active year, get the most recent year
            const academicYear = activeYear || await (this.prisma as any).academicYear.findFirst({
              where: { school_id: schoolId },
              orderBy: { start_date: 'desc' },
            });
            
            if (academicYear) {
              // Find or create ClassroomOffering
              let offering = await (this.prisma as any).classroomOffering.findUnique({
                where: {
                  academic_year_id_classroom_definition_id: {
                    academic_year_id: academicYear.id,
                    classroom_definition_id: definition.id,
                  },
                },
              });
              
              if (!offering) {
                offering = await (this.prisma as any).classroomOffering.create({
                  data: {
                    academic_year_id: academicYear.id,
                    classroom_definition_id: definition.id,
                    is_active: true,
                  },
                });
              }
              
              // Check for existing active enrollment in this academic year
              const existingEnrollment = await (this.prisma as any).studentEnrollment.findFirst({
                where: {
                  student_id: student.id,
                  academic_year_id: academicYear.id,
                  end_date: null, // Active enrollment
                },
              });
              
              if (!existingEnrollment) {
                // Create StudentEnrollment only if one doesn't already exist
                await (this.prisma as any).studentEnrollment.create({
                  data: {
                    student_id: student.id,
                    classroom_offering_id: offering.id,
                    academic_year_id: academicYear.id,
                    start_date: new Date(),
                    status: 'active',
                  },
                });
              } else {
                // Enrollment already exists - log info but don't fail
                console.log(`Student ${student.id} already has an active enrollment in academic year ${academicYear.id}`);
              }
            } else {
              // No academic year found - log warning but don't fail import
              errors.push(`Row ${line}: className "${row.className}" specified but no academic year found for school. Student imported without enrollment.`);
            }
          } catch (enrollmentError: any) {
            // Log enrollment error but don't fail the student import
            errors.push(`Row ${line}: Failed to create enrollment for className "${row.className}": ${enrollmentError.message}`);
          }
        }
        
        imported += 1;
        // Update sets so subsequent rows are checked against new inserts
        if (row.email) emails.add(row.email.toLowerCase());
        if (row.phone) phones.add(row.phone);
      } catch (e: any) {
        if (e?.code === 'P2002' && Array.isArray(e?.meta?.target)) {
          const target = e.meta.target as string[];
          if (target.includes('email')) {
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

  async promoteStudent(
    studentId: string,
    adminUserId: string,
    schoolId: string,
    params: { fromEnrollmentId: string; toOfferingId: string; actionDate?: Date; narration?: string },
  ) {
    const student = await this.findOwned(studentId, adminUserId);
    if (student.school_id !== schoolId) throw new ForbiddenException('Student not accessible');
    const actionDate = params.actionDate ?? new Date();
    return this.prisma.$transaction(async (tx) => {
      const from = await (tx as any).studentEnrollment.findUnique({
        where: { id: params.fromEnrollmentId },
        include: { classroom_offering: { include: { academic_year: true } } },
      });
      if (!from || from.student_id !== student.id) throw new BadRequestException('Invalid fromEnrollmentId');
      if (from.end_date) throw new BadRequestException('Enrollment already closed');
      const to = await (tx as any).classroomOffering.findUnique({
        where: { id: params.toOfferingId },
        include: { academic_year: true },
      });
      if (!to || to.academic_year.school_id !== schoolId) throw new ForbiddenException('Target offering not accessible');
      // Ensure next-year (by date)
      if (!(to.academic_year.start_date > from.classroom_offering.academic_year.start_date)) {
        throw new BadRequestException('Target offering must be in a later academic year');
      }
      // Disallow same classroom definition in later year
      if (to.classroom_definition_id === from.classroom_offering.classroom_definition_id) {
        throw new BadRequestException('Cannot promote to the same classroom definition');
      }
      // Ensure no active enrollment in target year
      const overlap = await (tx as any).studentEnrollment.findFirst({ where: { student_id: student.id, academic_year_id: to.academic_year_id, end_date: null } });
      if (overlap) throw new BadRequestException('Student already has an active enrollment in target academic year');
      if (from.start_date && actionDate < from.start_date) {
        throw new BadRequestException('Promotion date cannot precede enrollment startDate');
      }
      if (to.academic_year.start_date && actionDate < to.academic_year.start_date) {
        throw new BadRequestException('Promotion date must be within target academic year');
      }
      if (to.academic_year.end_date && actionDate > to.academic_year.end_date) {
        throw new BadRequestException('Promotion date must be within target academic year');
      }
      const closed = await (tx as any).studentEnrollment.update({
        where: { id: from.id },
        data: { end_date: actionDate, status: 'promoted' },
      });
      const opened = await (tx as any).studentEnrollment.create({
        data: {
          student_id: student.id,
          classroom_offering_id: to.id,
          academic_year_id: to.academic_year_id,
          start_date: actionDate,
          status: 'active',
        },
      });
      return { promotedFrom: closed, promotedTo: opened };
    });
  }

  async retainStudent(
    studentId: string,
    adminUserId: string,
    schoolId: string,
    params: { fromEnrollmentId: string; toOfferingId: string; actionDate?: Date; narration?: string; reason?: string },
  ) {
    const student = await this.findOwned(studentId, adminUserId);
    if (student.school_id !== schoolId) throw new ForbiddenException('Student not accessible');
    const actionDate = params.actionDate ?? new Date();
    return this.prisma.$transaction(async (tx) => {
      const from = await (tx as any).studentEnrollment.findUnique({
        where: { id: params.fromEnrollmentId },
        include: { classroom_offering: { include: { academic_year: true } } },
      });
      if (!from || from.student_id !== student.id) throw new BadRequestException('Invalid fromEnrollmentId');
      if (from.end_date) throw new BadRequestException('Enrollment already closed');
      const to = await (tx as any).classroomOffering.findUnique({
        where: { id: params.toOfferingId },
        include: { academic_year: true },
      });
      if (!to || to.academic_year.school_id !== schoolId) throw new ForbiddenException('Target offering not accessible');
      // Retention is also next academic year
      if (!(to.academic_year.start_date > from.classroom_offering.academic_year.start_date)) {
        throw new BadRequestException('Target offering must be in a later academic year');
      }
      // Do not allow returning to the exact same classroom definition
      if (to.classroom_definition_id === from.classroom_offering.classroom_definition_id) {
        throw new BadRequestException('Cannot retain into the same classroom definition');
      }
      const overlap = await (tx as any).studentEnrollment.findFirst({ where: { student_id: student.id, academic_year_id: to.academic_year_id, end_date: null } });
      if (overlap) throw new BadRequestException('Student already has an active enrollment in target academic year');
      if (from.start_date && actionDate < from.start_date) {
        throw new BadRequestException('Retention date cannot precede enrollment startDate');
      }
      if (to.academic_year.start_date && actionDate < to.academic_year.start_date) {
        throw new BadRequestException('Retention date must be within target academic year');
      }
      if (to.academic_year.end_date && actionDate > to.academic_year.end_date) {
        throw new BadRequestException('Retention date must be within target academic year');
      }
      const closed = await (tx as any).studentEnrollment.update({
        where: { id: from.id },
        data: { end_date: actionDate, status: 'retained' },
      });
      const opened = await (tx as any).studentEnrollment.create({
        data: {
          student_id: student.id,
          classroom_offering_id: to.id,
          academic_year_id: to.academic_year_id,
          start_date: actionDate,
          status: 'active',
        },
      });
      return { retainedFrom: closed, retainedTo: opened };
    });
  }

  async getEnrollmentHistory(
    studentId: string,
    adminUserId: string,
    schoolId: string,
    options: { yearId?: string; includeInactive?: boolean },
  ) {
    const student = await this.findOwned(studentId, adminUserId);
    if (student.school_id !== schoolId) throw new ForbiddenException('Student not accessible');
    const where: any = { student_id: studentId };
    if (options?.yearId) {
      where.academic_year_id = options.yearId;
    }
    if (!options?.includeInactive) {
      where.OR = [{ end_date: null }, { status: 'active' }];
    }
    return (this.prisma as any).studentEnrollment.findMany({
      where,
      include: {
        classroom_offering: {
          include: {
            academic_year: { select: { id: true, name: true, start_date: true, end_date: true, school_id: true } },
            classroom_definition: { select: { id: true, name: true, level: true } },
          },
        },
      },
      orderBy: [{ start_date: 'asc' }],
    });
  }

  async getEnrolledStudentsByClassroom(schoolId: string, academicYearId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Verify academic year belongs to school
    const academicYear = await (this.prisma as any).academicYear.findUnique({
      where: { id: academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }
    if (academicYear.school_id !== schoolId) {
      throw new ForbiddenException('Academic year does not belong to this school');
    }

    // Get all enrollments for this academic year
    const enrollments = await (this.prisma as any).studentEnrollment.findMany({
      where: {
        academic_year_id: academicYearId,
        end_date: null, // Only active enrollments
        status: 'active',
      },
      include: {
        student: {
          select: {
            id: true,
            student_no: true,
            reg_no: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            gender: true,
            date_of_birth: true,
            status: true,
          },
        },
        classroom_offering: {
          include: {
            classroom_definition: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          classroom_offering: {
            classroom_definition: {
              name: 'asc',
            },
          },
        },
        {
          student: {
            first_name: 'asc',
          },
        },
      ],
    });

    // Group by classroom offering
    const grouped: Record<string, {
      classroomOffering: {
        id: string;
        displayName: string | null;
        isActive: boolean;
        classroomDefinition: {
          id: string;
          name: string;
          level: string | null;
        };
      };
      students: Array<{
        enrollmentId: string;
        startDate: Date;
        student: {
          id: string;
          studentNo: string | null;
          regNo: string | null;
          firstName: string;
          lastName: string;
          email: string | null;
          phone: string | null;
          gender: string | null;
          dateOfBirth: Date | null;
          status: string | null;
        };
      }>;
    }> = {};

    for (const enrollment of enrollments) {
      const offeringId = enrollment.classroom_offering_id;
      if (!grouped[offeringId]) {
        grouped[offeringId] = {
          classroomOffering: {
            id: enrollment.classroom_offering.id,
            displayName: enrollment.classroom_offering.display_name,
            isActive: enrollment.classroom_offering.is_active,
            classroomDefinition: {
              id: enrollment.classroom_offering.classroom_definition.id,
              name: enrollment.classroom_offering.classroom_definition.name,
              level: enrollment.classroom_offering.classroom_definition.level,
            },
          },
          students: [],
        };
      }

      grouped[offeringId].students.push({
        enrollmentId: enrollment.id,
        startDate: enrollment.start_date,
        student: {
          id: enrollment.student.id,
          studentNo: enrollment.student.student_no,
          regNo: enrollment.student.reg_no,
          firstName: enrollment.student.first_name,
          lastName: enrollment.student.last_name,
          email: enrollment.student.email,
          phone: enrollment.student.phone,
          gender: enrollment.student.gender,
          dateOfBirth: enrollment.student.date_of_birth,
          status: enrollment.student.status,
        },
      });
    }

    // Convert to array format
    return {
      academicYear: {
        id: academicYear.id,
        name: academicYear.name,
        startDate: academicYear.start_date,
        endDate: academicYear.end_date,
      },
      classrooms: Object.values(grouped).map((group) => ({
        classroomOffering: group.classroomOffering,
        studentCount: group.students.length,
        students: group.students,
      })),
      totalStudents: enrollments.length,
    };
  }
}
