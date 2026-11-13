import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeeAssignmentsDto, UpdateFeeAssignmentDto } from './dto/fee-assignment.dto';

const STUDENT_SELECT = { id: true, first_name: true, last_name: true, student_no: true } as const;

@Injectable()
export class FeeAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  listForStudent(schoolId: string, studentId: string) {
    return this.prisma.studentFeeAssignment.findMany({
      where: { school_id: schoolId, student_id: studentId, status: 'ACTIVE' },
      include: {
        fee_structure: {
          select: {
            id: true, name: true, amount: true, academic_year_id: true,
            term_template_item: { select: { id: true, name: true } },
            fee_category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Students who can be assigned a structure: active enrollment in the structure's year
   * (and class, if the structure is class-specific), each flagged with any existing assignment.
   */
  async eligibleStudents(schoolId: string, feeStructureId: string) {
    const structure = await this.prisma.feeStructure.findFirst({
      where: { id: feeStructureId, school_id: schoolId },
      select: { id: true, academic_year_id: true, classroom_definition_id: true },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academic_year_id: structure.academic_year_id,
        status: 'active',
        deleted_at: null,
        ...(structure.classroom_definition_id && { classroom_definition_id: structure.classroom_definition_id }),
        student: { school_id: schoolId, deleted_at: null },
      },
      select: {
        classroom_definition: { select: { id: true, name: true } },
        student: { select: STUDENT_SELECT },
      },
    });
    const assignments = await this.prisma.studentFeeAssignment.findMany({
      where: { fee_structure_id: feeStructureId, status: 'ACTIVE' },
    });
    const byStudent = new Map(assignments.map((a) => [a.student_id, a]));

    const seen = new Set<string>();
    return enrollments
      .filter((e) => !seen.has(e.student.id) && seen.add(e.student.id))
      .map((e) => ({ ...e.student, classroom: e.classroom_definition, assignment: byStudent.get(e.student.id) ?? null }))
      .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
  }

  /** Idempotent: re-activates removed assignments, leaves active ones untouched. */
  async assign(schoolId: string, userId: string, dto: CreateFeeAssignmentsDto) {
    const structure = await this.prisma.feeStructure.findFirst({
      where: { id: dto.fee_structure_id, school_id: schoolId },
      select: { id: true },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const ids = [...new Set(dto.student_ids)];
    const found = await this.prisma.student.count({ where: { id: { in: ids }, school_id: schoolId, deleted_at: null } });
    if (found !== ids.length) throw new BadRequestException('One or more students do not belong to this school');

    await this.prisma.$transaction([
      this.prisma.studentFeeAssignment.updateMany({
        where: { fee_structure_id: structure.id, student_id: { in: ids }, status: 'REMOVED' },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.studentFeeAssignment.createMany({
        data: ids.map((student_id) => ({
          school_id: schoolId,
          student_id,
          fee_structure_id: structure.id,
          created_by_user_id: userId,
        })),
        skipDuplicates: true,
      }),
    ]);
    return { assigned: ids.length };
  }

  async update(schoolId: string, userId: string, id: string, dto: UpdateFeeAssignmentDto) {
    const current = await this.get(schoolId, id);
    const waived = dto.waived_amount !== undefined ? new Prisma.Decimal(dto.waived_amount) : current.waived_amount;
    const reason = dto.waiver_reason !== undefined ? dto.waiver_reason.trim() : current.waiver_reason;
    if (waived.gt(0) && !reason) throw new BadRequestException('A reason is required when waiving part of a fee');

    return this.prisma.studentFeeAssignment.update({
      where: { id },
      data: {
        ...(dto.amount_override !== undefined && {
          amount_override: dto.amount_override === null ? null : new Prisma.Decimal(dto.amount_override),
        }),
        waived_amount: waived,
        waiver_reason: waived.gt(0) ? reason : null,
        ...(dto.waived_amount !== undefined && { waived_by_user_id: waived.gt(0) ? userId : null }),
      },
    });
  }

  async remove(schoolId: string, id: string) {
    await this.get(schoolId, id);
    return this.prisma.studentFeeAssignment.update({ where: { id }, data: { status: 'REMOVED' } });
  }

  private async get(schoolId: string, id: string) {
    const row = await this.prisma.studentFeeAssignment.findFirst({ where: { id, school_id: schoolId } });
    if (!row) throw new NotFoundException('Fee assignment not found');
    return row;
  }
}
