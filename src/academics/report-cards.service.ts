import { Injectable, NotFoundException } from '@nestjs/common';
// Import your SchoolsService (adjust the path as needed)
import { PrismaService } from '../prisma/prisma.service';
import { SchoolsService } from '../schools/schools.service';
import { StudentsService } from '../students/students.service';
import { AcademicsService } from './academics.service';

@Injectable()
export class ReportCardsService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly academicsService: AcademicsService,
    private readonly studentsService: StudentsService,
    private readonly prisma: PrismaService,
  ) { }

  async getReportCardByIdentity(
    schoolId: string,
    userId: string,
    yearId: string,
    termId: string,
    identity: string,
  ) {
    // Fetch school info using the schoolId
    const school = await this.schoolsService.findOne(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Fetch the academic year
    const year = await this.academicsService.getYear(yearId, userId);
    if (year.school_id !== schoolId) {
      throw new NotFoundException('Year does not belong to the specified school');
    }

    // Find the term in the year's terms
    const term = year.terms.find(t => t.id === termId);
    if (!term) {
      throw new NotFoundException('Term not found in the specified year');
    }

    // Fetch the student
    const student = await this.studentsService.findByIdentity(schoolId, identity, userId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Fetch the student's enrollment for the year
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        student_id: student.id,
        academic_year_id: yearId,
        deleted_at: null,
      },
      include: {
        classroom_definition: true,
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Student not enrolled in the specified year');
    }

    // Parse class and stream from classroom name (assuming format "Class Stream")
    const classroomName = enrollment.classroom_definition.name;

    // Format dates
    const startDate = new Date(year.start_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const endDate = new Date(year.end_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const dates = `${startDate} – ${endDate}`;

    // Fetch actual subjects data for this student
    const subjectsData = await this.fetchStudentSubjectsWithGrades(
      student.id,
      enrollment.classroom_definition_id,
      yearId,
      termId,
    );

    // Calculate summary statistics
    const summary = this.calculateSummary(subjectsData);

    // Map to the structure expected by the frontend
    return {
      school: {
        name: school.name,
        contact: `${school.address} | Tel: ${school.phone} | ${school.email}`,
        motto: school.motto,
      },
      term: {
        name: term.name,
        year: year.name,
        dates: dates,
      },
      student: {
        name: `${student.first_name} ${student.last_name}`,
        regNo: student.reg_no || identity,
        class: classroomName,
        stream: classroomName,
      },
      subjects: subjectsData,
      summary,
      attendance: { present: 85, absent: 5 },
      conduct: "Excellent",
      activities: "Football, Debate Club",
      comments: {
        teacher: "Keep up the great work!",
        head: "Promoted to next class.",
      },
      grading: [
        { label: "A", range: "80–100", description: "Excellent" },
        { label: "B+", range: "75–79", description: "Very Good" },
        { label: "B", range: "70–74", description: "Good" },
        { label: "C", range: "60–69", description: "Credit" },
        { label: "D", range: "50–59", description: "Pass" },
        { label: "F", range: "0–49", description: "Fail" },
        { label: "Div 1", range: "Aggregate 8–32", description: "First Division" },
        { label: "Div 2", range: "Aggregate 33–45", description: "Second Division" },
        { label: "Div 3", range: "Aggregate 46–58", description: "Third Division" },
        { label: "Div 4", range: "Aggregate 59–72", description: "Fourth Division" },
      ],
    };
  }

  /**
   * Return the classroom definition level for a student enrollment (e.g. 'O-Level'|'A-Level')
   */
  async getEnrollmentLevelByIdentity(
    schoolId: string,
    userId: string,
    yearId: string,
    identity: string,
  ): Promise<string> {
    // Fetch the student (reuse existing helper/service)
    const student = await this.studentsService.findByIdentity(schoolId, identity, userId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Fetch enrollment for the year and include classroom definition
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        student_id: student.id,
        academic_year_id: yearId,
        deleted_at: null,
      },
      include: { classroom_definition: true },
    });

    if (!enrollment || !enrollment.classroom_definition) {
      throw new NotFoundException('Student not enrolled in the specified year');
    }

    return enrollment.classroom_definition.level || 'O-Level';
    // return 'A-Level'; // For testing purposes, we can hardcode this to 'A-Level' to trigger the new report card format
  }

  /**
   * Fetch all subjects with student grades for a specific classroom, year, and term
   */
  private async fetchStudentSubjectsWithGrades(
    studentId: string,
    classroomDefinitionId: string,
    yearId: string,
    termId: string,
  ) {
    // Get all assessments for this classroom, year, and term
    const assessments = await this.prisma.assessment.findMany({
      where: {
        classroom_definition_id: classroomDefinitionId,
        academic_year_id: yearId,
        term_template_item_id: termId,
      },
      include: {
        component: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!assessments || assessments.length === 0) {
      return [];
    }

    // Group assessments by subject
    const subjectMap = new Map<string, any>();
    for (const assessment of assessments) {
      const subjectId = assessment.component.subject.id;
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: assessment.component.subject,
          assessments: [],
        });
      }
      subjectMap.get(subjectId).assessments.push(assessment);
    }

    // For each subject, fetch student grades and build components + calculate weighted average
    const subjects: any[] = [];
    for (const [subjectId, data] of subjectMap) {
      const subjectGrades = await this.prisma.grade.findMany({
        where: {
          student_id: studentId,
          subject_id: subjectId,
          assessment: {
            academic_year_id: yearId,
            term_template_item_id: termId,
          },
        },
        include: {
          assessment: {
            include: {
              component: true, // include component so we can use its name / weight
            },
          },
        },
      });

      if (subjectGrades.length > 0) {
        // Build components array from individual grade records
        const components = subjectGrades.map(g => {
          const assessment = g.assessment || ({} as any);
          const component = assessment.component || ({} as any);
          const percentage = Number(g.percentage);
          const weight = Number(assessment.weight) || undefined;
          const compScore = Number.isFinite(percentage) ? percentage : undefined;
          const compGrade = typeof compScore === 'number' ? this.calculateLetterGrade(compScore) : undefined;

          return {
            name: component.name || `Assessment ${assessment.id}`,
            score: compScore,
            grade: compGrade,
            credits: weight,
            remarks: g.remarks || '',
          };
        });

        // Calculate weighted average using the same helper (works on original grade records)
        const { weightedScore, totalWeight } = this.calculateWeightedAverage(subjectGrades);
        const average = totalWeight > 0 ? weightedScore / totalWeight : 0;
        const roundedAverage = Math.round(average * 100) / 100;

        // Determine total credits for the subject (sum of assessment weights if present, fallback to count)
        const totalCredits = subjectGrades.reduce((sum, g) => {
          const w = Number(g.assessment?.weight) || 0;
          return sum + w;
        }, 0) || subjectGrades.length;

        subjects.push({
          name: data.subject.name,
          // provide individual component entries
          components,
          // aggregated fields for compatibility
          score: roundedAverage,
          grade: this.calculateLetterGrade(roundedAverage),
          credits: totalCredits,
          remarks: this.getRemarkForScore(roundedAverage),
        });
      }
    }

    return subjects;
  }

  /**
   * Calculate weighted average from grades
   */
  private calculateWeightedAverage(grades: any[]) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const grade of grades) {
      const percentage = Number(grade.percentage) || 0;
      const weight = Number(grade.assessment.weight) || 0;
      totalScore += percentage * weight;
      totalWeight += weight;
    }

    return { weightedScore: totalScore, totalWeight };
  }

  /**
   * Calculate letter grade from percentage
   */
  private calculateLetterGrade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }

  /**
   * Get remark based on score
   */
  private getRemarkForScore(score: number): string {
    if (score >= 90) return 'Outstanding';
    if (score >= 80) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Credit';
    if (score >= 50) return 'Pass';
    return 'Fail';
  }

  /**
   * Calculate summary statistics from subjects data
   */
  private calculateSummary(subjectsData: any[]) {
    if (subjectsData.length === 0) {
      return {
        totalMarks: 0,
        totalCredits: 0,
        average: 0,
        gpa: 0,
        division: 'N/A',
        rank: 0,
      };
    }

    const totalMarks = subjectsData.reduce((sum, s) => sum + s.score, 0);
    const average = totalMarks / subjectsData.length;
    const totalCredits = subjectsData.reduce((sum, s) => sum + s.credits, 0);

    // Calculate GPA (assuming 4-point scale: A+ = 4.0, A = 3.9, etc.)
    const gpaValue = subjectsData.reduce((sum, s) => {
      const gradePoints = {
        'A+': 4.0,
        'A': 3.9,
        'B+': 3.7,
        'B': 3.5,
        'C': 3.0,
        'D': 2.0,
        'F': 0.0,
      };
      return sum + (gradePoints[s.grade] || 0);
    }, 0) / subjectsData.length;

    // Determine division based on average
    let division = 'IV';
    if (average >= 75) division = 'I';
    else if (average >= 65) division = 'II';
    else if (average >= 55) division = 'III';

    return {
      totalMarks: Math.round(totalMarks * 100) / 100,
      totalCredits,
      average: Math.round(average * 100) / 100,
      gpa: Math.round(gpaValue * 100) / 100,
      division,
      rank: 'N/A', // Rank calculation requires comparing with all classmates
    };
  }
}
