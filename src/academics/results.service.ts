import {
  BadRequestException,
  ForbiddenException,
  Injectable, Logger,
  NotFoundException
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { BulkCreateGradesDto } from './dto/bulk-create-grades.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { GenerateReportCardDto } from './dto/generate-report-card.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(private readonly prisma: PrismaService) { }

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

  async listSubjects(
    schoolId: string,
    adminUserId: string,
    includeInactive = false
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).subject.findMany({
      where: {
        school_id: schoolId,
        ...(includeInactive ? {} : { is_active: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(
    schoolId: string,
    adminUserId: string,
    data: CreateSubjectDto
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Check for existing subject with same name or code (active)
    const existing = await (this.prisma as any).subject.findFirst({
      where: {
        school_id: schoolId,
        OR: [
          { name: data.name.trim() },
          { code: data.code?.trim() || null },
        ],
        is_active: true,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'A subject with this name or code already exists for this school'
      );
    }

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
      throw e;
    }
  }

  async createSubjects(
    schoolId: string,
    adminUserId: string,
    dataArray: CreateSubjectDto[]
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new BadRequestException('Array of subjects is required');
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      // Check for existing subject with same name or code (active)
      const existing = await (this.prisma as any).subject.findFirst({
        where: {
          school_id: schoolId,
          OR: [
            { name: data.name.trim() },
            { code: data.code?.trim() || null },
          ],
          is_active: true,
        },
      });
      if (existing) {
        errors.push(
          `Subject ${i + 1} (${data.name}): A subject with this name or code already exists for this school`
        );
        continue;
      }
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
        errors.push(`Subject ${i + 1} (${data.name}): ${e?.message || 'Failed to create'}`);
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

  async updateSubject(
    subjectId: string,
    adminUserId: string,
    data: UpdateSubjectDto
  ) {
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

  async deleteSubject(subjectId: string, adminUserId: string) {
    const subject = await (this.prisma as any).subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    await this.assertIsAdminOfSchool(subject.school_id, adminUserId);

    // Check if there are assessments for this subject
    const assessmentCount = await (this.prisma as any).assessment.count({
      where: { subject_id: subjectId },
    });

    if (assessmentCount > 0) {
      throw new BadRequestException('Cannot delete subject with existing assessments');
    }

    return (this.prisma as any).subject.delete({
      where: { id: subjectId },
    });
  }

  // ==========================================
  // ASSESSMENT MANAGEMENT
  // ==========================================

  async listAssessments(
    schoolId: string,
    adminUserId: string,
    yearId: string,
    termItemId: string,
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    const where: any = {
      school_id: schoolId,
      academic_year_id: yearId,
      term_template_item_id: termItemId,
    };

    const assessments = await (this.prisma as any).assessment.findMany({
      where,
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        classroom_definition: {
          select: { id: true, name: true, level: true },
        },
        term_template_item: {
          select: { id: true, name: true, ordinal: true },
        },
      },
      orderBy: { assessment_date: 'desc' },
    });

    const groups: Record<string, any> = {};
    for (const a of assessments) {
      const defId = a.classroom_definition_id || '__unassigned__';
      if (!groups[defId]) {
        groups[defId] = {
          classroomDefinition: a.classroom_definition || null,
          assessments: [],
        };
      }
      groups[defId].assessments.push(a);
    }

    // Convert to array and sort by classroom name when available
    const result = Object.values(groups).sort((x: any, y: any) => {
      const nameA = x.classroomDefinition?.name || '';
      const nameB = y.classroomDefinition?.name || '';
      return nameA.localeCompare(nameB);
    });

    return result;
  }

  async createAssessment(
    schoolId: string,
    adminUserId: string,
    data: CreateAssessmentDto
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Verify academic year exists and belongs to school
    const year = await (this.prisma as any).academicYear.findUnique({
      where: { id: data.yearId },
    });
    if (!year) throw new NotFoundException('Academic year not found');
    if (year.school_id !== schoolId) {
      throw new ForbiddenException('Academic year does not belong to this school');
    }

    // Verify term item exists and belongs to the academic year's term template
    const termItem = await (this.prisma as any).termTemplateItem.findUnique({
      where: { id: (data as any).termTemplateItemId },
    });
    if (!termItem) throw new NotFoundException('Term template item not found');
    if (termItem.term_template_id !== year.term_template_id) {
      throw new BadRequestException(
        'Term item does not belong to the academic year term template'
      );
    }

    // Verify subject exists and belongs to school
    const subject = await (this.prisma as any).subject.findUnique({
      where: { id: data.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    if (subject.school_id !== schoolId) {
      throw new ForbiddenException('Subject does not belong to this school');
    }

    // Verify classroom definition exists and belongs to school
    const classroomDef = await (this.prisma as any).classroomDefinition.findUnique({
      where: { id: (data as any).classroomDefinitionId },
    });
    if (!classroomDef) throw new NotFoundException('Classroom definition not found');
    if (classroomDef.school_id !== schoolId) {
      throw new ForbiddenException('Classroom definition does not belong to this school');
    }

    // Check for duplicate assessment (same year, term item, subject, classroom, name, and type)
    const existing = await (this.prisma as any).assessment.findFirst({
      where: {
        academic_year_id: data.yearId,
        term_template_item_id: (data as any).termTemplateItemId,
        subject_id: data.subjectId,
        classroom_definition_id: (data as any).classroomDefinitionId,
        name: data.name.trim(),
        type: data.type,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'An assessment with this name and type already exists for this subject and term'
      );
    }
    return (this.prisma as any).assessment.create({
      data: {
        school_id: schoolId,
        academic_year_id: data.yearId,
        term_template_item_id: (data as any).termTemplateItemId,
        subject_id: data.subjectId,
        classroom_definition_id: (data as any).classroomDefinitionId,
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

  async updateAssessment(
    assessmentId: string,
    adminUserId: string,
    data: UpdateAssessmentDto
  ) {
    const assessment = await (this.prisma as any).assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.assertIsAdminOfSchool(assessment.school_id, adminUserId);

    // Prevent updating immutable fields (yearId, termTemplateItemId, classroomDefinitionId)
    const dataAsAny = data as any;
    if (dataAsAny.yearId !== undefined || dataAsAny.termTemplateItemId !== undefined || dataAsAny.termItemId !== undefined) {
      throw new BadRequestException(
        'yearId and termTemplateItemId are immutable after creation. Delete and recreate the assessment if term context must change.'
      );
    }
    if (dataAsAny.classroomDefinitionId !== undefined) {
      throw new BadRequestException(
        'classroomDefinitionId is immutable after creation. Delete and recreate the assessment to change classroom context.'
      );
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.maxScore !== undefined) updateData.max_score = data.maxScore;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.assessmentDate !== undefined) updateData.assessment_date = data.assessmentDate ? new Date(data.assessmentDate) : null;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate ? new Date(data.dueDate) : null;
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
          academic_year_id: assessment.academic_year_id,
          term_template_item_id: assessment.term_template_item_id,
          subject_id: assessment.subject_id,
          name: checkName,
          type: checkType,
          id: { not: assessmentId }, // Exclude current assessment
        },
      });
      if (existing) {
        throw new BadRequestException(
          'An assessment with this name and type already exists for this subject and term'
        );
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

  async getEnrolledStudentsForAssessment(assessmentId: string, adminUserId: string) {
    // 1. Lookup assessment
    const assessment = await (this.prisma as any).assessment.findUnique({
      where: { id: assessmentId },
      select: {
        academic_year_id: true,
        classroom_definition_id: true,
        school_id: true,
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertIsAdminOfSchool(assessment.school_id, adminUserId);

    // 2. Get all students already graded for this assessment
    const gradedStudentIds = (
      await (this.prisma as any).grade.findMany({
        where: { assessment_id: assessmentId },
        select: { student_id: true },
      })
    ).map((g: any) => g.student_id);

    // 3. Query enrollments for that year and classroom, filter out graded students
    const enrollments = await (this.prisma as any).studentEnrollment.findMany({
      where: {
        academic_year_id: assessment.academic_year_id,
        classroom_definition_id: assessment.classroom_definition_id,
        status: 'active',
        student_id: gradedStudentIds.length > 0 ? { notIn: gradedStudentIds } : undefined,
      },
      include: {
        student: true,
      },
      orderBy: { created_at: 'asc' },
    });
    // 4. Return student details
    return enrollments.map((e: any) => e.student);
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
            `Failed to create grade for student
             ${gradeData.studentId}: 
             ${errorInfo.message} (${errorInfo.statusCode})`,
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

  async getStudentGrades(
    studentId: string,
    adminUserId: string,
    yearId?: string,
    termItemId?: string,
    subjectId?: string
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.assertIsAdminOfSchool(student.school_id, adminUserId);

    return this.getStudentGradesInternal(student, yearId, termItemId, subjectId);
  }

  async getStudentGradesForViewer(studentId: string, user: AuthenticatedUser, yearId?: string, termItemId?: string, subjectId?: string) {
    const student = await this.assertCanViewStudent(studentId, user);
    return this.getStudentGradesInternal(student, yearId, termItemId, subjectId);
  }

  private async getStudentGradesInternal(student: any, yearId?: string, termItemId?: string, subjectId?: string) {
    const where: any = {
      student_id: student.id,
      school_id: student.school_id,
    };
    if (yearId && termItemId) {
      where.assessment = { academic_year_id: yearId, term_template_item_id: termItemId };
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

  async getStudentAcademicSummary(studentId: string, adminUserId: string, yearId: string, termItemId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.assertIsAdminOfSchool(student.school_id, adminUserId);

    return this.getStudentAcademicSummaryInternal(student, yearId, termItemId);
  }

  async getStudentAcademicSummaryForViewer(studentId: string, user: AuthenticatedUser, yearId: string, termItemId: string) {
    const student = await this.assertCanViewStudent(studentId, user);
    return this.getStudentAcademicSummaryInternal(student, yearId, termItemId);
  }

  private async getStudentAcademicSummaryInternal(student: any, yearId: string, termItemId: string) {
    // Verify academic year exists
    const year = await (this.prisma as any).academicYear.findUnique({
      where: { id: yearId },
    });
    if (!year) throw new NotFoundException('Academic year not found');
    if (year.school_id !== student.school_id) {
      throw new ForbiddenException('Academic year does not belong to this school');
    }

    // Verify term item exists and belongs to the academic year's term template
    const termItem = await (this.prisma as any).termTemplateItem.findUnique({ where: { id: termItemId } });
    if (!termItem) throw new NotFoundException('Term not found for given year and id');
    if (termItem.term_template_id !== year.term_template_id) {
      throw new NotFoundException('Term item does not belong to the academic year template');
    }

    // Get all grades for this student in this term (using assessment academic_year_id + term_template_item_id)
    const grades = await (this.prisma as any).grade.findMany({
      where: {
        student_id: student.id,
        assessment: {
          academic_year_id: yearId,
          term_template_item_id: termItemId,
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
    const subjectAverages: Record<string, {
      subject: any;
      totalScore: number;
      totalWeight: number;
      average: number;
      grades: any[];
    }> = {};

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
        id: null,
        name: termItem.name,
        ordinal: termItem.ordinal || null,
      },
      academicYear: {
        id: year.id,
        name: year.name,
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

    // Verify academic year and resolve term by name
    const year = await (this.prisma as any).academicYear.findUnique({
      where: { id: data.academicYearId },
    });
    if (!year) throw new NotFoundException('Academic year not found');
    if (year.school_id !== schoolId) {
      throw new ForbiddenException('Academic year does not belong to this school');
    }

    // Verify term item exists and belongs to the year
    const termItem2 = await (this.prisma as any).termTemplateItem.findUnique({ where: { id: data.termTemplateItemId } });
    if (!termItem2) throw new NotFoundException('Term not found for given year and id');
    if (termItem2.term_template_id !== year.term_template_id) {
      throw new NotFoundException('Term item does not belong to the academic year template');
    }

    // Get academic summary
    const summary = await this.getStudentAcademicSummary(data.studentId, adminUserId, data.academicYearId, data.termTemplateItemId);

    // Calculate rank if requested
    let rank: number | null = null;
    let totalStudents = 0;

    if (data.includeRank) {
      // Get all students in the same classroom definition for this term
      const enrollment = await (this.prisma as any).studentEnrollment.findFirst({
        where: {
          student_id: data.studentId,
          academic_year_id: data.academicYearId,
          status: 'active',
        },
        include: {
          classroom_definition: true,
        },
      });

      if (enrollment) {
        // Get all active enrollments in the same classroom definition
        const classmates = await (this.prisma as any).studentEnrollment.findMany({
          where: {
            classroom_definition_id: enrollment.classroom_definition_id,
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
            const classSummary = await this.getStudentAcademicSummary(enr.student_id, adminUserId, data.academicYearId, data.termTemplateItemId);
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
        term_template_item_id: data.termTemplateItemId,
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

    // Get the academic summary using stored term template item id
    const summary = await this.getStudentAcademicSummary(
      reportCard.student_id,
      adminUserId,
      reportCard.academic_year_id,
      reportCard.term_template_item_id
    );

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

  async listGradesForAssessmentAndClassroom(
    schoolId: string,
    adminUserId: string,
    assessmentId: string,
    classroomDefinitionId: string,
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Find grades for the assessment and classroom
    return (this.prisma as any).grade.findMany({
      where: {
        school_id: schoolId,
        assessment_id: assessmentId,
        student: {
          enrollments: {
            some: {
              classroom_definition_id: classroomDefinitionId,
              status: 'active',
            },
          },
        },
      },
      include: {
        assessment: true,
        student: true,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async listGradesForAssessment(
    schoolId: string,
    adminUserId: string,
    assessmentId: string,
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).grade.findMany({
      where: {
        school_id: schoolId,
        assessment_id: assessmentId,
      },
      include: {
        // assessment: true,
        student: true,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async getStudentResultsByIdentity(
    schoolId: string,
    adminUserId: string,
    yearId: string,
    termItemId: string,
    identity: string,
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    if (!identity) {
      throw new BadRequestException('Student identity (studentNo or regNo) is required');
    }

    // Find student by student_no OR reg_no
    const student = await this.prisma.student.findFirst({
      where: {
        school_id: schoolId,
        OR: [
          { student_no: identity },
          { reg_no: identity },
        ],
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Get grades for this student in the specified year and term
    const grades = await this.getStudentGradesInternal(student, yearId, termItemId);

    // Optionally, calculate overall average and letter grade
    let overallAverage = 0;
    let overallLetterGrade = '';
    if (grades.length > 0) {
      const avg = grades.reduce((sum: any, g: any) => sum + (g.percentage || 0), 0) / grades.length;
      overallAverage = Number(avg.toFixed(2));
      overallLetterGrade = this.calculateLetterGrade(overallAverage);
    }

    return {
      student: {
        id: student.id,
        student_no: student.student_no,
        reg_no: student.reg_no,
        first_name: student.first_name,
        last_name: student.last_name,
      },
      academicYear: { id: yearId },
      term: { id: termItemId },
      grades: grades.map((g: any) => ({
        assessment: {
          id: g.assessment?.id,
          name: g.assessment?.name,
          subject: g.assessment?.subject
            ? { id: g.assessment.subject.id, name: g.assessment.subject.name }
            : null,
        },
        score: g.score,
        percentage: g.percentage,
        letter_grade: g.letter_grade,
        remarks: g.remarks,
      })),
      overallAverage,
      overallLetterGrade,
    };
  }

  async getResultsByClassroom(
    schoolId: string,
    adminUserId: string,
    yearId: string,
    termItemId: string,
    definitionId: string,
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // 1. Find all active enrollments for the classroom in the given year
    const enrollments = await (this.prisma as any).studentEnrollment.findMany({
      where: {
        academic_year_id: yearId,
        classroom_definition_id: definitionId,
        status: 'active',
      },
      include: {
        student: true,
      },
    });

    const studentIds = enrollments.map((e: any) => e.student_id);

    // 2. Get all grades for these students in the specified term/classroom
    const grades = await (this.prisma as any).grade.findMany({
      where: {
        school_id: schoolId,
        student_id: { in: studentIds },
        assessment: {
          academic_year_id: yearId,
          term_template_item_id: termItemId,
          classroom_definition_id: definitionId,
        },
      },
      include: {
        student: true,
        assessment: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    // 3. Group grades by student_id
    const gradesByStudent: Record<string, any[]> = {};
    for (const grade of grades) {
      if (!gradesByStudent[grade.student_id]) {
        gradesByStudent[grade.student_id] = [];
      }
      gradesByStudent[grade.student_id].push({
        assessment: {
          id: grade.assessment?.id,
          name: grade.assessment?.name,
          subject: grade.assessment?.subject
            ? { id: grade.assessment.subject.id, name: grade.assessment.subject.name }
            : null,
        },
        score: grade.score,
        percentage: grade.percentage,
        letter_grade: grade.letter_grade,
        remarks: grade.remarks,
      });
    }

    // 4. Build result for every enrolled student (even if no grades)
    const results = enrollments.map((enrollment: any) => ({
      student: {
        id: enrollment.student.id,
        student_no: enrollment.student.student_no,
        reg_no: enrollment.student.reg_no,
        first_name: enrollment.student.first_name,
        last_name: enrollment.student.last_name,
      },
      grades: gradesByStudent[enrollment.student_id] || [],
    }));

    // 5. Get all assessments for this classroom/year/term
    const assessments = await (this.prisma as any).assessment.findMany({
      where: {
        school_id: schoolId,
        academic_year_id: yearId,
        term_template_item_id: termItemId,
        classroom_definition_id: definitionId,
      },
      include: {
        subject: true,
      },
      orderBy: { assessment_date: 'asc' },
    });

    return {
      assessments,
      results,
    };
  }
}
