import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

// File validation constants
const MAX_FILE_SIZE = parseInt(process.env.MAX_IMPORT_FILE_SIZE || '5242880'); // 5MB default
const ALLOWED_MIME_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
const ALLOWED_EXTENSIONS = ['.xlsx'];

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
    return { valid: false, error: `Invalid file extension. Only .xlsx files are allowed` };
  }
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Invalid file type. Must be Excel (.xlsx)` };
  }
  return { valid: true };
}

// Parse DD-MM-YYYY date format
function parseDateDDMMYYYY(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (isNaN(d.getTime())) return null;
  // Validate that input matches parsed date (prevent invalid dates like 31-02-2020)
  if (d.getDate() !== parseInt(day) || d.getMonth() !== parseInt(month) - 1 || d.getFullYear() !== parseInt(year)) {
    return null;
  }
  return d;
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) { }
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

  private normalizeGender(g?: string | null): string | undefined {
    if (g === undefined || g === null) return undefined;
    const raw = String(g).trim();
    if (raw === '') return undefined;
    const t = raw.toUpperCase();
    if (t === 'M' || t === 'MALE') return 'Male';
    if (t === 'F' || t === 'FEMALE') return 'Female';
    throw new BadRequestException("gender must be 'M' or 'F'");
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

  async listUnenrolledStudents(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    // Get students who have no enrollment records (or only deleted enrollments)
    return this.prisma.student.findMany({
      where: {
        school_id: schoolId,
        deleted_at: null,
        enrollments: {
          none: {
            deleted_at: null,
          },
        },
      },
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
      dateOfBirth: Date;
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
            gender: this.normalizeGender(data.gender),
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
      gender?: string | null;
      status?: string | null;
      dateOfBirth?: string | null;
      religion?: string;
      address?: string;
      avatarUrl?: string | null;
    },
  ) {
    const student = await this.findOwned(studentId, adminUserId);
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.gender !== undefined) {
      const raw = (data.gender ?? '').toString();
      if (raw.trim() === '') updateData.gender = null;
      else updateData.gender = this.normalizeGender(raw);
    }
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
      ['First Name', 'Last Name', 'Email', 'Phone', 'Gender (M/F)', 'Date Of Birth (DD-MM-YYYY)', 'Religion', 'Address'],
    ]);
    // Freeze header row
    (worksheet as any)['!freeze'] = { xSplit: 0, ySplit: 1 };
    // Make header row read-only and data rows editable
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // Mark header row cells as locked (read-only)
    for (let c = 0; c < cols.length; c += 1) {
      const ref = `${cols[c]}1`;
      if ((worksheet as any)[ref]) {
        (worksheet as any)[ref].s = { protection: { locked: true } } as any;
      }
    }

    // Mark data rows as unlocked (editable)
    const maxRows = 1000; // editable rows to guide users
    for (let r = 2; r <= maxRows + 1; r += 1) {
      for (let c = 0; c < cols.length; c += 1) {
        const ref = `${cols[c]}${r}`;
        (worksheet as any)[ref] = (worksheet as any)[ref] || { v: '', t: 's' };
        (worksheet as any)[ref].s = { protection: { locked: false } } as any;
      }
    }
    (worksheet as any)['!ref'] = `A1:H${maxRows + 1}`;
    (worksheet as any)['!protect'] = { password: 'upload', selectLockedCells: true, selectUnlockedCells: true } as any;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  generateCsvTemplate(): string {
    return 'firstName,lastName,email,phone,gender (M/F),dateOfBirth,religion,address,className\n';
  }

  private parseCsv(buffer: Buffer): Array<{ firstName: string; lastName: string; email?: string; phone?: string; gender?: string; status?: string; dateOfBirth?: string; religion?: string; address?: string }> {
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
    const rows: Array<{ firstName: string; lastName: string; email?: string; phone?: string; gender?: string; status?: string; dateOfBirth?: string; religion?: string; address?: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: any = {};
      const genderIdx = headerMap['gender'] !== undefined ? headerMap['gender'] : headerMap['gender (m/f)'];
      if (headerMap['firstname'] !== undefined) row.firstName = (values[headerMap['firstname']] || '').trim();
      if (headerMap['lastname'] !== undefined) row.lastName = (values[headerMap['lastname']] || '').trim();
      if (headerMap['email'] !== undefined) row.email = (values[headerMap['email']] || '').trim() || undefined;
      if (headerMap['phone'] !== undefined) row.phone = (values[headerMap['phone']] || '').trim() || undefined;
      if (genderIdx !== undefined) row.gender = (values[genderIdx] || '').trim() || undefined;
      if (headerMap['status'] !== undefined) row.status = (values[headerMap['status']] || '').trim() || undefined;
      if (headerMap['dateofbirth'] !== undefined) row.dateOfBirth = (values[headerMap['dateofbirth']] || '').trim() || undefined;
      if (headerMap['religion'] !== undefined) row.religion = (values[headerMap['religion']] || '').trim() || undefined;
      if (headerMap['address'] !== undefined) row.address = (values[headerMap['address']] || '').trim() || undefined;
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

  private parseWorkbook(buffer: Buffer): Array<{ firstName: string; lastName: string; email?: string; phone?: string; gender?: string; status?: string; dateOfBirth?: string; religion?: string; address?: string }> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as any[];
    return rows.map((r) => {
      const firstName = String(r['First Name'] || r.firstName || r['firstName'] || '').trim();
      const lastName = String(r['Last Name'] || r.lastName || r['lastName'] || '').trim();
      const email = String(r['Email'] || r.email || r['email'] || '').trim() || undefined;
      const phone = String(r['Phone'] || r.phone || r['phone'] || '').trim() || undefined;
      const rawGender = String(r['Gender (M/F)'] || r['Gender'] || r.gender || r['gender'] || '').trim();
      const gender = rawGender ? (rawGender.charAt(0).toUpperCase()) : undefined;
      const status = String(r['Status'] || r.status || r['status'] || '').trim() || undefined;
      const religion = String(r['Religion'] || r.religion || r['religion'] || '').trim() || undefined;
      const address = String(r['Address'] || r.address || r['address'] || '').trim() || undefined;

      // Normalize Excel date serials, Date objects, or strings into DD-MM-YYYY
      const dateCell = r['Date Of Birth (DD-MM-YYYY)'] || r.dateOfBirth || r['dateOfBirth'];
      let dateOfBirth: string | undefined = undefined;
      if (dateCell !== undefined && dateCell !== null && dateCell !== '') {
        if (typeof dateCell === 'number') {
          try {
            const parsed = (XLSX as any).SSF.parse_date_code(dateCell);
            if (parsed && parsed.y) {
              const dd = String(parsed.d).padStart(2, '0');
              const mm = String(parsed.m).padStart(2, '0');
              const yyyy = parsed.y;
              dateOfBirth = `${dd}-${mm}-${yyyy}`;
            } else {
              dateOfBirth = String(dateCell).trim();
            }
          } catch (e) {
            dateOfBirth = String(dateCell).trim();
          }
        } else if (dateCell instanceof Date) {
          const dd = String(dateCell.getDate()).padStart(2, '0');
          const mm = String(dateCell.getMonth() + 1).padStart(2, '0');
          const yyyy = dateCell.getFullYear();
          dateOfBirth = `${dd}-${mm}-${yyyy}`;
        } else {
          dateOfBirth = String(dateCell).trim();
        }
      }

      return {
        firstName,
        lastName,
        email,
        phone,
        gender,
        status,
        dateOfBirth: dateOfBirth || undefined,
        religion,
        address,
      };
    });
  }

  async validateImportFile(schoolId: string, adminUserId: string, buffer: Buffer) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!buffer || buffer.length === 0) {
      return { valid: false, errors: ['No file uploaded'], total: 0 };
    }
    let rows;
    try {
      rows = this.parseWorkbook(buffer);
      console.log("xxx1 importValidation", rows)
    } catch (e: any) {
      return { valid: false, errors: [`File parsing error: ${e?.message || 'Failed to parse file'}`], total: 0 };
    }
    const errors: string[] = [];
    // Load existing values in this school for uniqueness checks
    const existing = await this.prisma.student.findMany({
      where: { school_id: schoolId },
      select: { email: true, phone: true, first_name: true, last_name: true, date_of_birth: true },
    });
    const existingEmails = new Set<string>(existing.map(e => (e.email || '').toLowerCase()).filter(v => v));
    const existingPhones = new Set<string>(existing.map(e => e.phone!).filter(Boolean) as string[]);
    const existingNames = new Set<string>(existing.map(e => `${e.first_name}|${e.last_name}|${e.date_of_birth?.toISOString().split('T')[0]}`).filter(v => v !== '||'));

    // Track duplicates inside the file
    const fileEmails = new Set<string>();
    const filePhones = new Set<string>();
    const fileNames = new Set<string>();

    rows.forEach((row, idx) => {
      const line = idx + 2; // +1 header, +1 1-based
      if (!row.firstName) errors.push(`Row ${line}: firstName is required`);
      if (!row.lastName) errors.push(`Row ${line}: lastName is required`);
      if (!row.dateOfBirth) {
        errors.push(`Row ${line}: dateOfBirth is required`);
      } else {
        const dob = parseDateDDMMYYYY(row.dateOfBirth);
        if (!dob) {
          errors.push(`Row ${line}: dateOfBirth must be in DD-MM-YYYY format`);
        }
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push(`Row ${line}: email is invalid`);
      if (row.phone && !/^\+?\d{10,}$/.test(row.phone)) errors.push(`Row ${line}: phone must be at least 10 digits, optionally prefixed with +`);
      if (row.gender && !/^[MF]$/i.test(row.gender)) errors.push(`Row ${line}: gender must be 'M' or 'F'`);

      // Check firstName+lastName+dateOfBirth uniqueness
      const dob = row.dateOfBirth ? parseDateDDMMYYYY(row.dateOfBirth) : null;
      if (row.firstName && row.lastName && dob) {
        const nameKey = `${row.firstName}|${row.lastName}|${dob.toISOString().split('T')[0]}`;
        if (fileNames.has(nameKey)) errors.push(`Row ${line}: duplicate firstName+lastName+dateOfBirth in file`);
        else fileNames.add(nameKey);
        if (existingNames.has(nameKey)) errors.push(`Row ${line}: firstName+lastName+dateOfBirth already exists`);
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
      select: { email: true, phone: true, first_name: true, last_name: true, date_of_birth: true },
    });
    const emails = new Set<string>(existing.map(e => (e.email || '').toLowerCase()).filter(v => v));
    const phones = new Set<string>(existing.map(e => e.phone!).filter(Boolean) as string[]);
    const names = new Set<string>(existing.map(e => `${e.first_name}|${e.last_name}|${e.date_of_birth?.toISOString().split('T')[0]}`).filter(v => v !== '||'));

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const line = i + 2;
      if (!row.firstName || !row.lastName) {
        errors.push(`Row ${line}: firstName and lastName are required`);
        continue;
      }
      if (!row.dateOfBirth) {
        errors.push(`Row ${line}: dateOfBirth is required`);
        continue;
      }
      const dateOfBirth = parseDateDDMMYYYY(row.dateOfBirth);
      if (!dateOfBirth) {
        errors.push(`Row ${line}: dateOfBirth must be in DD-MM-YYYY format`);
        continue;
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${line}: email is invalid`);
        continue;
      }
      if (row.phone && !/^\+?\d{10,}$/.test(row.phone)) {
        errors.push(`Row ${line}: phone must be at least 10 digits, optionally prefixed with +`);
        continue;
      }

      // Check firstName+lastName+dateOfBirth uniqueness
      const nameKey = `${row.firstName}|${row.lastName}|${dateOfBirth.toISOString().split('T')[0]}`;
      if (names.has(nameKey)) {
        errors.push(`Row ${line}: firstName+lastName+dateOfBirth already exists`);
        continue;
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
            student = await this.prisma.student.create({
              data: {
                school_id: schoolId,
                student_no: studentNo,
                reg_no: regNo,
                first_name: row.firstName,
                last_name: row.lastName,
                email: row.email,
                phone: row.phone,
                gender: row.gender ? (row.gender.toUpperCase() === 'M' ? 'Male' : 'Female') : undefined,
                status: 'active',
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
              if (['first_name', 'last_name', 'date_of_birth'].every(k => target.includes(k))) {
                errors.push(`Row ${line}: firstName+lastName+dateOfBirth already exists`);
                break;
              }
            }
            throw e;
          }
        }

        if (!student) {
          errors.push(`Row ${line}: Failed to create student`);
          continue;
        }

        imported += 1;
        // Update sets so subsequent rows are checked against new inserts
        if (row.email) emails.add(row.email.toLowerCase());
        if (row.phone) phones.add(row.phone);
        names.add(nameKey);
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

  async promoteStudent(
    studentId: string,
    adminUserId: string,
    schoolId: string,
    params: { fromEnrollmentId: string; toYearId: string; toDefinitionId: string; actionDate?: Date; narration?: string },
  ) {
    const student = await this.findOwned(studentId, adminUserId);
    if (student.school_id !== schoolId) throw new ForbiddenException('Student not accessible');
    const actionDate = params.actionDate ?? new Date();
    return this.prisma.$transaction(async (tx) => {
      const from = await (tx as any).studentEnrollment.findUnique({
        where: { id: params.fromEnrollmentId },
        include: { academic_year: true },
      });
      if (!from || from.student_id !== student.id) throw new BadRequestException('Invalid fromEnrollmentId');
      if (from.end_date) throw new BadRequestException('Enrollment already closed');

      const toYear = await (tx as any).academicYear.findUnique({ where: { id: params.toYearId } });
      if (!toYear || toYear.school_id !== schoolId) throw new ForbiddenException('Target academic year not accessible');

      const toDefinition = await (tx as any).classroomDefinition.findUnique({ where: { id: params.toDefinitionId } });
      if (!toDefinition || toDefinition.school_id !== schoolId) throw new ForbiddenException('Target classroom definition not accessible');

      // Ensure next-year (by date)
      if (!(toYear.start_date > from.academic_year.start_date)) {
        throw new BadRequestException('Target academic year must be in a later year');
      }
      // Disallow same classroom definition in later year
      if (params.toDefinitionId === from.classroom_definition_id) {
        throw new BadRequestException('Cannot promote to the same classroom definition');
      }
      // Ensure no active enrollment in target year
      const overlap = await (tx as any).studentEnrollment.findFirst({ where: { student_id: student.id, academic_year_id: params.toYearId, end_date: null } });
      if (overlap) throw new BadRequestException('Student already has an active enrollment in target academic year');
      if (from.start_date && actionDate < from.start_date) {
        throw new BadRequestException('Promotion date cannot precede enrollment startDate');
      }
      if (toYear.start_date && actionDate < toYear.start_date) {
        throw new BadRequestException('Promotion date must be within target academic year');
      }
      if (toYear.end_date && actionDate > toYear.end_date) {
        throw new BadRequestException('Promotion date must be within target academic year');
      }
      const closed = await (tx as any).studentEnrollment.update({
        where: { id: from.id },
        data: { end_date: actionDate, status: 'promoted' },
      });
      const opened = await (tx as any).studentEnrollment.create({
        data: {
          student_id: student.id,
          classroom_definition_id: params.toDefinitionId,
          academic_year_id: params.toYearId,
          start_date: actionDate,
          status: 'pending', // promotion creates a pending placement
          type: 'promotion',
        },
      });
      return { promotedFrom: closed, promotedTo: opened };
    });
  }

  async retainStudent(
    studentId: string,
    adminUserId: string,
    schoolId: string,
    params: { fromEnrollmentId: string; toYearId: string; toDefinitionId: string; actionDate?: Date; narration?: string; reason?: string },
  ) {
    const student = await this.findOwned(studentId, adminUserId);
    if (student.school_id !== schoolId) throw new ForbiddenException('Student not accessible');
    const actionDate = params.actionDate ?? new Date();
    return this.prisma.$transaction(async (tx) => {
      const from = await (tx as any).studentEnrollment.findUnique({
        where: { id: params.fromEnrollmentId },
        include: { academic_year: true },
      });
      if (!from || from.student_id !== student.id) throw new BadRequestException('Invalid fromEnrollmentId');
      if (from.end_date) throw new BadRequestException('Enrollment already closed');

      const toYear = await (tx as any).academicYear.findUnique({ where: { id: params.toYearId } });
      if (!toYear || toYear.school_id !== schoolId) throw new ForbiddenException('Target academic year not accessible');

      const toDefinition = await (tx as any).classroomDefinition.findUnique({ where: { id: params.toDefinitionId } });
      if (!toDefinition || toDefinition.school_id !== schoolId) throw new ForbiddenException('Target classroom definition not accessible');

      // Retention is also next academic year
      if (!(toYear.start_date > from.academic_year.start_date)) {
        throw new BadRequestException('Target academic year must be in a later academic year');
      }
      // Do not allow returning to the exact same classroom definition
      if (params.toDefinitionId === from.classroom_definition_id) {
        throw new BadRequestException('Cannot retain into the same classroom definition');
      }
      const overlap = await (tx as any).studentEnrollment.findFirst({ where: { student_id: student.id, academic_year_id: params.toYearId, end_date: null } });
      if (overlap) throw new BadRequestException('Student already has an active enrollment in target academic year');
      if (from.start_date && actionDate < from.start_date) {
        throw new BadRequestException('Retention date cannot precede enrollment startDate');
      }
      if (toYear.start_date && actionDate < toYear.start_date) {
        throw new BadRequestException('Retention date must be within target academic year');
      }
      if (toYear.end_date && actionDate > toYear.end_date) {
        throw new BadRequestException('Retention date must be within target academic year');
      }
      const closed = await (tx as any).studentEnrollment.update({
        where: { id: from.id },
        data: { end_date: actionDate, status: 'retained' },
      });
      const opened = await (tx as any).studentEnrollment.create({
        data: {
          student_id: student.id,
          classroom_definition_id: params.toDefinitionId,
          academic_year_id: params.toYearId,
          start_date: actionDate,
          status: 'pending',
          type: 'retention',
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
        classroom_definition: { select: { id: true, name: true, level: true, is_archived: true } },
        academic_year: { select: { id: true, name: true, start_date: true, end_date: true, school_id: true } },
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
        classroom_definition: {
          select: { id: true, name: true, level: true, is_archived: true },
        },
      },
      orderBy: [
        {
          classroom_definition: {
            name: 'asc',
          },
        },
        {
          student: {
            first_name: 'asc',
          },
        },
      ],
    });

    // Group by classroom definition
    const grouped: Record<string, {
      classroomDefinition: {
        id: string;
        name: string;
        level: string | null;
        isArchived: boolean;
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
      const definitionId = enrollment.classroom_definition_id;
      if (!grouped[definitionId]) {
        grouped[definitionId] = {
          classroomDefinition: {
            id: enrollment.classroom_definition.id,
            name: enrollment.classroom_definition.name,
            level: enrollment.classroom_definition.level,
            isArchived: enrollment.classroom_definition.is_archived ?? false,
          },
          students: [],
        };
      }

      grouped[definitionId].students.push({
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
        classroomDefinition: group.classroomDefinition,
        studentCount: group.students.length,
        students: group.students,
      })),
      totalStudents: enrollments.length,
    };
  }
}
