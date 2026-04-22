import { Injectable, NotFoundException } from '@nestjs/common';
// Import your SchoolsService (adjust the path as needed)
import { SchoolsService } from '../schools/schools.service';

@Injectable()
export class ReportCardsService {
  constructor(
    private readonly schoolsService: SchoolsService,
  ) {}

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

    // Map to the structure expected by the frontend
    return {
      school: {
        name: school.name,
        contact: `${school.address} | Tel: ${school.phone} | ${school.email}`,
        motto: school.motto,
      },
      term: {
        name: "Term II",
        year: "2025",
        dates: "May 10 – Aug 15, 2025",
      },
      student: {
        name: "Jane Doe",
        regNo: identity,
        class: "S.2",
        stream: "East",
      },
      subjects: [
        { name: "Mathematics", score: 85, grade: "A", credits: 4, remarks: "Excellent" },
        { name: "English", score: 78, grade: "B+", credits: 3, remarks: "Very Good" },
        { name: "Biology", score: 65, grade: "C", credits: 3, remarks: "Good" },
        { name: "History", score: 90, grade: "A+", credits: 2, remarks: "Outstanding" },
      ],
      summary: {
        totalMarks: 318,
        totalCredits: 12,
        average: 79.5,
        gpa: 4.2,
        division: "I",
        rank: 3,
      },
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
}