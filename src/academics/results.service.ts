import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkCreateGradesDto } from './dto/bulk-create-grades.dto';
import { GenerateReportCardDto } from './dto/generate-report-card.dto';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
    });
    if (!rel) throw new ForbiddenException('Insufficient permissions for this school');
  }

  private async assertCanViewStudent(studentId: string, user: AuthenticatedUser) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // School admins must be admins of the student's school
    if (user.role === 'SCHOOL_ADMIN') {
      await this.assertIsAdminOfSchool(student.school_id, user.id);
      return student;
    }

    // Parents can only view their own children within the same school
    if (user.role === 'PARENT') {
      if (!user.school_id || user.school_id !== student.school_id) {
        throw new ForbiddenException('Insufficient permissions for this student');
      }

      const guardians = await (this.prisma as any).guardian.findMany({
        where: {
          school_id: student.school_id,
          email: user.email,
        },
        include: {
          students: {
            select: { student_id: true },
          },
        },
      });

      const canView = guardians.some((g: any) =>
        g.students?.some((sg: any) => sg.student_id === student.id),
      );

      if (!canView) {
        throw new ForbiddenException('Insufficient permissions for this student');
      }

      return student;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private calculatePercentage(score: number, maxScore: number): number {
    if (maxScore === 0) return 0;
    return (score / maxScore) * 100;
  }

  private calculateLetterGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  // ==========================================
  // SUBJECT MANAGEMENT
  // ==========================================

  async listSubjects(schoolId: string, adminUserId: string, includeInactive = false) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).subject.findMany({
      where: {
        school_id: schoolId,
        ...(includeInactive ? {} : { is_active: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(schoolId: string, adminUserId: string, data: CreateSubjectDto) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    try {
      return await (this.prisma as any).subject.create({
        data: {
          school_id: schoolId,
          name: data.name.trim(),
          code: data.code?.trim() || null,
          description: data.description?.trim() || null,
          is_active: data.isActive !== undefined ? data.isActive : true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('A subject with this name already exists for this school');
      }
      throw e;
    }
  }

  async createSubjects(schoolId: string, adminUserId: string, dataArray: CreateSubjectDto[]) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new BadRequestException('Array of subjects is required');
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      try {
        const subject = await (this.prisma as any).subject.create({
          data: {
            school_id: schoolId,
            name: data.name.trim(),
            code: data.code?.trim() || null,
            description: data.description?.trim() || null,
            is_active: data.isActive !== undefined ? data.isActive : true,
          },
        });
        results.push(subject);
      } catch (e: any) {
        if (e?.code === 'P2002') {
          errors.push(`Subject ${i + 1} (${data.name}): A subject with this name already exists for this school`);
        } else {
          errors.push(`Subject ${i + 1} (${data.name}): ${e?.message || 'Failed to create'}`);
        }
      }
    }

    return {
      created: results.length,
      failed: errors.length,
      subjects: results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async getSubject(subjectId: string, adminUserId: string) {
    const subject = await (this.prisma as any).subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    await this.assertIsAdminOfSchool(subject.school_id, adminUserId);
    return subject;
  }

  async updateSubject(subjectId: string, adminUserId: string, data: UpdateSubjectDto) {
    const subject = await (this.prisma as any).subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    await this.assertIsAdminOfSchool(subject.school_id, adminUserId);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code?.trim() || null;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    try {
      return await (this.prisma as any).subject.update({
        where: { id: subjectId },
        data: updateData,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('A subject with this name already exists for this school');
      }
      throw e;
    }
  }

  // ==========================================
  // ASSESSMENT MANAGEMENT
  // ==========================================

  async listAssessments(schoolId: string, adminUserId: string, termId?: string, subjectId?: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    const where: any = { school_id: schoolId };
    if (termId) where.term_id = termId;
    if (subjectId) where.subject_id = subjectId;

    return (this.prisma as any).assessment.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { assessment_date: 'desc' },
    });
  }

  async createAssessment(schoolId: string, adminUserId: string, data: CreateAssessmentDto) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Verify term exists and belongs to school
    const term = await (this.prisma as any).term.findUnique({
      where: { id: data.termId },
      include: { academic_year: true },
    });
    if (!term) throw new NotFoundException('Term not found');
    if (term.academic_year.school_id !== schoolId) {
      throw new ForbiddenException('Term does not belong to this school');
    }

    // Verify subject exists and belongs to school
    const subject = await (this.prisma as any).subject.findUnique({
      where: { id: data.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    if (subject.school_id !== schoolId) {
      throw new ForbiddenException('Subject does not belong to this school');
    }

    // Check for duplicate assessment (same term, subject, name, and type)
    const existing = await (this.prisma as any).assessment.findFirst({
      where: {
        term_id: data.termId,
        subject_id: data.subjectId,
        name: data.name.trim(),
        type: data.type,
      },
    });
    if (existing) {
      throw new BadRequestException('An assessment with this name and type already exists for this subject and term');
    }

    return (this.prisma as any).assessment.create({
      data: {
        school_id: schoolId,
        term_id: data.termId,
        subject_id: data.subjectId,
        name: data.name.trim(),
        type: data.type,
        max_score: data.maxScore,
        weight: data.weight,
        assessment_date: data.assessmentDate ? new Date(data.assessmentDate) : null,
        due_date: data.dueDate ? new Date(data.dueDate) : null,
        is_published: data.isPublished || false,
      },
    });
  }

  async getAssessment(assessmentId: string, adminUserId: string) {
    const assessment = await (this.prisma as any).assessment.findUnique({
      where: { id: assessmentId },
      include: {
        subject: true,
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.assertIsAdminOfSchool(assessment.school_id, adminUserId);
    return assessment;
  }

  async updateAssessment(assessmentId: string, adminUserId: string, data: UpdateAssessmentDto) {
    const assessment = await (this.prisma as any).assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.assertIsAdminOfSchool(assessment.school_id, adminUserId);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.maxScore !== undefined) updateData.max_score = data.maxScore;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.isPublished !== undefined) updateData.is_published = data.isPublished;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    // Check for duplicate assessment if name or type is being updated
    if (data.name !== undefined || data.type !== undefined) {
      const checkName = data.name !== undefined ? data.name.trim() : assessment.name;
      const checkType = data.type !== undefined ? data.type : assessment.type;
      const existing = await (this.prisma as any).assessment.findFirst({
        where: {
          term_id: assessment.term_id,
          subject_id: assessment.subject_id,
          name: checkName,
          type: checkType,
          id: { not: assessmentId }, // Exclude current assessment
        },
      });
      if (existing) {
        throw new BadRequestException('An assessment with this name and type already exists for this subject and term');
      }
    }

    return (this.prisma as any).assessment.update({
      where: { id: assessmentId },
      data: updateData,
    });
  }

  async deleteAssessment(assessmentId: string, adminUserId: string) {
    const assessment = await (this.prisma as any).assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.assertIsAdminOfSchool(assessment.school_id, adminUserId);

    // Check if there are grades for this assessment
    const gradeCount = await (this.prisma as any).grade.count({
      where: { assessment_id: assessmentId },
    });

    if (gradeCount > 0) {
      throw new BadRequestException('Cannot delete assessment with existing grades');
    }

    return (this.prisma as any).assessment.delete({
      where: { id: assessmentId },
    });
  }

  // ==========================================
  // GRADE MANAGEMENT
  // ==========================================

  async createGrade(schoolId: string, adminUserId: string, data: CreateGradeDto) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Verify student exists and belongs to school
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (student.school_id !== schoolId) {
      throw new ForbiddenException('Student does not belong to this school');
    }

    // Verify assessment exists and belongs to school
    const assessment = await (this.prisma as any).assessment.findUnique({
      where: { id: data.assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.school_id !== schoolId) {
      throw new ForbiddenException('Assessment does not belong to this school');
    }

    // Validate score doesn't exceed max score
    const maxScore = Number(assessment.max_score);
    if (data.score > maxScore) {
      throw new BadRequestException(`Score cannot exceed maximum score of ${maxScore}`);
    }

    const percentage = this.calculatePercentage(data.score, maxScore);
    const letterGrade = data.letterGrade || this.calculateLetterGrade(percentage);

    try {
      return await (this.prisma as any).grade.create({
        data: {
          school_id: schoolId,
          student_id: data.studentId,
          assessment_id: data.assessmentId,
          subject_id: assessment.subject_id,
          score: data.score,
          percentage: percentage,
          letter_grade: letterGrade,
          remarks: data.remarks?.trim() || null,
          created_by: adminUserId,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Grade already exists for this student and assessment');
      }
      throw e;
    }
  }

  async bulkCreateGrades(schoolId: string, adminUserId: string, data: BulkCreateGradesDto) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Verify assessment exists
    const assessment = await (this.prisma as any).assessment.findUnique({
      where: { id: data.assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.school_id !== schoolId) {
      throw new ForbiddenException('Assessment does not belong to this school');
    }

    // Verify all students belong to school
    const studentIds = data.grades.map((g) => g.studentId);
    const students = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        school_id: schoolId,
      },
    });

    if (students.length !== studentIds.length) {
      throw new BadRequestException('One or more students not found or do not belong to this school');
    }

    const results: any[] = [];
    const errorDetails: Array<{ studentId: string; message: string; statusCode: number }> = [];
    const maxScore = Number(assessment.max_score);
    const startTime = Date.now();

    this.logger.log(
      `Starting bulk grade creation for assessment ${data.assessmentId} with ${data.grades.length} grades`,
    );

    // Create grades with transaction support
    try {
      const gradesToCreate = data.grades.map((gradeData) => {
        if (gradeData.score > maxScore) {
          throw new BadRequestException(
            `Student ${gradeData.studentId}: Score ${gradeData.score} exceeds maximum score of ${maxScore}`,
          );
        }

        const percentage = this.calculatePercentage(gradeData.score, maxScore);
        const letterGrade = gradeData.letterGrade || this.calculateLetterGrade(percentage);

        return {
          school_id: schoolId,
          student_id: gradeData.studentId,
          assessment_id: data.assessmentId,
          subject_id: assessment.subject_id,
          score: gradeData.score,
          percentage: percentage,
          letter_grade: letterGrade,
          remarks: gradeData.remarks?.trim() || null,
          created_by: adminUserId,
        };
      });

      // Use transaction for atomic operations
      const createdGrades = await (this.prisma as any).$transaction(
        gradesToCreate.map((gradeData) =>
          (this.prisma as any).grade.create({ data: gradeData }),
        ),
      );

      results.push(...createdGrades);
      const duration = Date.now() - startTime;
      this.logger.log(
        `Bulk grade creation completed successfully. Created ${results.length} grades in ${duration}ms`,
      );
    } catch (e: any) {
      // If transaction fails, attempt individual creation to identify specific failures
      this.logger.warn(
        `Bulk transaction failed (${e?.message}), attempting individual grade creation for error tracking`,
      );

      for (const gradeData of data.grades) {
        try {
          if (gradeData.score > maxScore) {
            errorDetails.push({
              studentId: gradeData.studentId,
              message: `Score ${gradeData.score} exceeds maximum score of ${maxScore}`,
              statusCode: 400,
            });
            continue;
          }

          const percentage = this.calculatePercentage(gradeData.score, maxScore);
          const letterGrade = gradeData.letterGrade || this.calculateLetterGrade(percentage);

          const grade = await (this.prisma as any).grade.create({
            data: {
              school_id: schoolId,
              student_id: gradeData.studentId,
              assessment_id: data.assessmentId,
              subject_id: assessment.subject_id,
              score: gradeData.score,
              percentage: percentage,
              letter_grade: letterGrade,
              remarks: gradeData.remarks?.trim() || null,
              created_by: adminUserId,
            },
          });
          results.push(grade);
        } catch (innerE: any) {
          const errorInfo = this.formatGradeErrorMessage(gradeData.studentId, innerE);
          errorDetails.push(errorInfo);
          this.logger.warn(
            `Failed to create grade for student ${gradeData.studentId}: ${errorInfo.message} (${errorInfo.statusCode})`,
          );
        }
      }
    }

    return {
      created: results.length,
      failed: errorDetails.length,
      grades: results,
      errors: errorDetails.length > 0 ? errorDetails : undefined,
    };
  }

  private formatGradeErrorMessage(
    studentId: string,
    error: any,
  ): { studentId: string; message: string; statusCode: number } {
    let message: string;
    let statusCode: number;

    if (error?.code === 'P2002') {
      message = 'Grade already exists for this student and assessment';
      statusCode = 409; // Conflict
    } else if (error?.status === 400 || error?.code === 'INVALID_SCORE') {
      message = error?.message || 'Invalid score';
      statusCode = 400; // Bad Request
    } else if (error?.status === 404) {
      message = error?.message || 'Student not found';
      statusCode = 404; // Not Found
    } else if (error?.status === 403) {
      message = error?.message || 'Access forbidden';
      statusCode = 403; // Forbidden
    } else if (error?.message) {
      message = error.message;
      statusCode = 500; // Internal Server Error (generic database error)
    } else {
      message = 'Unknown error occurred';
      statusCode = 500;
    }

    return {
      studentId,
      message,
      statusCode,
    };
  }

  async getGrade(gradeId: string, adminUserId: string) {
    const grade = await (this.prisma as any).grade.findUnique({
      where: { id: gradeId },
      include: {
        assessment: {
          include: {
            subject: true,
          },
        },
      },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    await this.assertIsAdminOfSchool(grade.school_id, adminUserId);
    return grade;
  }

  async updateGrade(gradeId: string, adminUserId: string, data: UpdateGradeDto) {
    const grade = await (this.prisma as any).grade.findUnique({
      where: { id: gradeId },
      include: {
        assessment: true,
      },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    await this.assertIsAdminOfSchool(grade.school_id, adminUserId);

    const updateData: any = {};

    if (data.score !== undefined) {
      const maxScore = Number(grade.assessment.max_score);
      if (data.score > maxScore) {
        throw new BadRequestException(`Score cannot exceed maximum score of ${maxScore}`);
      }
      updateData.score = data.score;
      updateData.percentage = this.calculatePercentage(data.score, maxScore);
      if (!data.letterGrade) {
        updateData.letter_grade = this.calculateLetterGrade(updateData.percentage);
      }
    }

    if (data.letterGrade !== undefined) {
      updateData.letter_grade = data.letterGrade;
    }

    if (data.remarks !== undefined) {
      updateData.remarks = data.remarks?.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return (this.prisma as any).grade.update({
      where: { id: gradeId },
      data: updateData,
    });
  }

  async deleteGrade(gradeId: string, adminUserId: string) {
    const grade = await (this.prisma as any).grade.findUnique({
      where: { id: gradeId },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    await this.assertIsAdminOfSchool(grade.school_id, adminUserId);

    return (this.prisma as any).grade.delete({
      where: { id: gradeId },
    });
  }

  // ==========================================
  // STUDENT ACADEMIC HISTORY
  // ==========================================

  async getStudentGrades(studentId: string, adminUserId: string, termId?: string, subjectId?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.assertIsAdminOfSchool(student.school_id, adminUserId);

    return this.getStudentGradesInternal(student, termId, subjectId);
  }

  async getStudentGradesForViewer(studentId: string, user: AuthenticatedUser, termId?: string, subjectId?: string) {
    const student = await this.assertCanViewStudent(studentId, user);
    return this.getStudentGradesInternal(student, termId, subjectId);
  }

  private async getStudentGradesInternal(student: any, termId?: string, subjectId?: string) {
    const where: any = {
      student_id: student.id,
      school_id: student.school_id,
    };
    if (termId) {
      where.assessment = { term_id: termId };
    }
    if (subjectId) {
      where.subject_id = subjectId;
    }

    const grades = await (this.prisma as any).grade.findMany({
      where,
      include: {
        assessment: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Sort by assessment date descending (manual sort since nested orderBy may not work)
    return grades.sort((a: any, b: any) => {
      const dateA = a.assessment?.assessment_date ? new Date(a.assessment.assessment_date).getTime() : 0;
      const dateB = b.assessment?.assessment_date ? new Date(b.assessment.assessment_date).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getStudentAcademicSummary(studentId: string, adminUserId: string, termId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.assertIsAdminOfSchool(student.school_id, adminUserId);

    return this.getStudentAcademicSummaryInternal(student, termId);
  }

  async getStudentAcademicSummaryForViewer(studentId: string, user: AuthenticatedUser, termId: string) {
    const student = await this.assertCanViewStudent(studentId, user);
    return this.getStudentAcademicSummaryInternal(student, termId);
  }

  private async getStudentAcademicSummaryInternal(student: any, termId: string) {
    // Verify term exists
    const term = await (this.prisma as any).term.findUnique({
      where: { id: termId },
      include: { academic_year: true },
    });
    if (!term) throw new NotFoundException('Term not found');
    if (term.academic_year.school_id !== student.school_id) {
      throw new ForbiddenException('Term does not belong to this school');
    }

    // Get all grades for this student in this term
    const grades = await (this.prisma as any).grade.findMany({
      where: {
        student_id: student.id,
        assessment: {
          term_id: termId,
        },
      },
      include: {
        assessment: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Calculate subject averages
    const subjectAverages: Record<string, { subject: any; totalScore: number; totalWeight: number; average: number; grades: any[] }> = {};

    for (const grade of grades) {
      const subjectId = grade.subject_id;
      if (!subjectAverages[subjectId]) {
        subjectAverages[subjectId] = {
          subject: grade.assessment.subject,
          totalScore: 0,
          totalWeight: 0,
          average: 0,
          grades: [],
        };
      }

      const weightedScore = Number(grade.percentage) * Number(grade.assessment.weight);
      subjectAverages[subjectId].totalScore += weightedScore;
      subjectAverages[subjectId].totalWeight += Number(grade.assessment.weight);
      subjectAverages[subjectId].grades.push(grade);
    }

    // Calculate final averages
    const subjectResults = Object.values(subjectAverages).map((subj) => {
      const avg = subj.totalWeight > 0 ? subj.totalScore / subj.totalWeight : 0;
      const roundedAvg = Number(avg.toFixed(2));
      return {
        subject: subj.subject,
        average: roundedAvg,
        letterGrade: subj.totalWeight > 0 ? this.calculateLetterGrade(roundedAvg) : null,
        grades: subj.grades,
      };
    });

    // Calculate overall average
    const overallAverageRaw =
      subjectResults.length > 0
        ? subjectResults.reduce((sum, subj) => sum + subj.average, 0) / subjectResults.length
        : 0;
    const overallAverage = Number(overallAverageRaw.toFixed(2));

    return {
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        student_no: student.student_no,
      },
      term: {
        id: term.id,
        name: term.name,
        ordinal: term.ordinal,
      },
      academicYear: {
        id: term.academic_year.id,
        name: term.academic_year.name,
      },
      overallAverage,
      overallLetterGrade: subjectResults.length > 0 ? this.calculateLetterGrade(overallAverage) : null,
      subjects: subjectResults,
      totalSubjects: subjectResults.length,
    };
  }

  // ==========================================
  // REPORT CARD GENERATION
  // ==========================================

  async generateReportCard(schoolId: string, adminUserId: string, data: GenerateReportCardDto) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Verify student
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (student.school_id !== schoolId) {
      throw new ForbiddenException('Student does not belong to this school');
    }

    // Verify academic year and term
    const term = await (this.prisma as any).term.findUnique({
      where: { id: data.termId },
      include: { academic_year: true },
    });
    if (!term) throw new NotFoundException('Term not found');
    if (term.academic_year.id !== data.academicYearId) {
      throw new BadRequestException('Term does not belong to the specified academic year');
    }
    if (term.academic_year.school_id !== schoolId) {
      throw new ForbiddenException('Academic year does not belong to this school');
    }

    // Get academic summary
    const summary = await this.getStudentAcademicSummary(data.studentId, adminUserId, data.termId);

    // Calculate rank if requested
    let rank: number | null = null;
    let totalStudents = 0;

    if (data.includeRank) {
      // Get all students in the same classroom offering for this term
      const enrollment = await (this.prisma as any).studentEnrollment.findFirst({
        where: {
          student_id: data.studentId,
          academic_year_id: data.academicYearId,
          status: 'active',
        },
        include: {
          classroom_offering: true,
        },
      });

      if (enrollment) {
        // Get all active enrollments in the same classroom offering
        const classmates = await (this.prisma as any).studentEnrollment.findMany({
          where: {
            classroom_offering_id: enrollment.classroom_offering_id,
            academic_year_id: data.academicYearId,
            status: 'active',
          },
          include: {
            student: true,
          },
        });

        totalStudents = classmates.length;

        // Calculate averages for all classmates
        const classAverages = await Promise.all(
          classmates.map(async (enr: any) => {
            const classSummary = await this.getStudentAcademicSummary(enr.student_id, adminUserId, data.termId);
            return {
              studentId: enr.student_id,
              average: classSummary.overallAverage,
            };
          }),
        );

        // Sort by average descending
        classAverages.sort((a, b) => b.average - a.average);

        // Find rank
        const studentIndex = classAverages.findIndex((c) => c.studentId === data.studentId);
        rank = studentIndex >= 0 ? studentIndex + 1 : null;
      }
    }

    // Create report card record
    const reportCard = await (this.prisma as any).reportCard.create({
      data: {
        school_id: schoolId,
        student_id: data.studentId,
        academic_year_id: data.academicYearId,
        term_id: data.termId,
        overall_average: summary.overallAverage,
        total_subjects: summary.totalSubjects,
        rank: rank,
        total_students: totalStudents,
        remarks: null,
        status: data.autoPublish ? 'published' : 'draft',
        generated_by: adminUserId,
        published_at: data.autoPublish ? new Date() : null,
      },
    });

    return {
      ...reportCard,
      summary,
    };
  }

  async getReportCard(reportCardId: string, adminUserId: string) {
    const reportCard = await (this.prisma as any).reportCard.findUnique({
      where: { id: reportCardId },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            student_no: true,
          },
        },
      },
    });
    if (!reportCard) throw new NotFoundException('Report card not found');

    await this.assertIsAdminOfSchool(reportCard.school_id, adminUserId);

    // Get the academic summary
    const summary = await this.getStudentAcademicSummary(reportCard.student_id, adminUserId, reportCard.term_id);

    return {
      ...reportCard,
      summary,
    };
  }

  async listStudentReportCards(studentId: string, adminUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.assertIsAdminOfSchool(student.school_id, adminUserId);

    return this.listStudentReportCardsInternal(student);
  }

  async listStudentReportCardsForViewer(studentId: string, user: AuthenticatedUser) {
    const student = await this.assertCanViewStudent(studentId, user);
    return this.listStudentReportCardsInternal(student);
  }

  private async listStudentReportCardsInternal(student: any) {
    return (this.prisma as any).reportCard.findMany({
      where: {
        student_id: student.id,
        school_id: student.school_id,
      },
      orderBy: {
        generated_at: 'desc',
      },
    });
  }

  async publishReportCard(reportCardId: string, adminUserId: string) {
    const reportCard = await (this.prisma as any).reportCard.findUnique({
      where: { id: reportCardId },
    });
    if (!reportCard) throw new NotFoundException('Report card not found');

    await this.assertIsAdminOfSchool(reportCard.school_id, adminUserId);

    return (this.prisma as any).reportCard.update({
      where: { id: reportCardId },
      data: {
        status: 'published',
        published_at: new Date(),
      },
    });
  }
}

