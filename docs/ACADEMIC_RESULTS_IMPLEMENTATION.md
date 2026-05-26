# Academic Results & Report Generation - Implementation Guide

## Overview

This document describes the implementation of student results and academic report generation features in the Atom School Management system.

## Database Schema

### New Models (in `results_mgt` schema)

1. **Subject** - Represents subjects/courses taught in schools
   - Fields: id, school_id, name, code, description, is_active
   - Unique constraint: school_id + name

2. **Assessment** - Represents different types of assessments (exams, tests, assignments)
  - Fields: id, school_id, academic_year_id, term_template_item_id, classroom_definition_id, subject_id, name, type, max_score, weight, date, due_date, is_published
   - Types: "exam", "test", "assignment", "project", "quiz"
  - Note: yearId + term_template_item_id are immutable after creation

3. **Grade** - Represents student scores for assessments
   - Fields: id, school_id, student_id, assessment_id, subject_id, score, percentage, letter_grade, remarks, created_by
   - Unique constraint: student_id + assessment_id
   - Automatically calculates percentage and letter grade

4. **ReportCard** - Generated report cards for students
  - Fields: id, school_id, student_id, academic_year_id, term_template_item_id, overall_average, total_subjects, rank, total_students, remarks, status, generated_at, published_at, pdf_url
   - Status: "draft", "published", "archived"

## API Endpoints

### Subject Management

- `GET /schools/:schoolId/subjects` - List all subjects
- `POST /schools/:schoolId/subjects` - Create a new subject
- `GET /schools/:schoolId/subjects/:id` - Get subject details
- `PATCH /schools/:schoolId/subjects/:id` - Update subject

### Assessment Management

- `GET /schools/:schoolId/assessments` - List assessments (optional filters: termId, subjectId)
- `POST /schools/:schoolId/assessments` - Create a new assessment
- `GET /schools/:schoolId/assessments/:id` - Get assessment details
- `PATCH /schools/:schoolId/assessments/:id` - Update assessment
- `DELETE /schools/:schoolId/assessments/:id` - Delete assessment (only if no grades exist)

### Grade Management

- `POST /schools/:schoolId/grades` - Create a single grade
- `POST /schools/:schoolId/grades/bulk` - Bulk create grades for multiple students
- `GET /schools/:schoolId/grades/:id` - Get grade details
- `PATCH /schools/:schoolId/grades/:id` - Update grade
- `DELETE /schools/:schoolId/grades/:id` - Delete grade

### Student Results

- `GET /students/:studentId/results` - Get student's grades (optional filters: termId, subjectId)
- `GET /students/:studentId/results/summary?termId=:termId` - Get academic summary for a term

### Report Cards

- `POST /schools/:schoolId/report-cards` - Generate a new report card
- `GET /schools/:schoolId/report-cards/:id` - Get report card details
- `PATCH /schools/:schoolId/report-cards/:id/publish` - Publish a report card
- `GET /students/:studentId/report-cards` - List all report cards for a student

## Features

### Grade Calculation

- **Percentage Calculation**: Automatically calculated as `(score / max_score) * 100`
- **Letter Grade**: Automatically assigned based on percentage:
  - A: 90-100%
  - B: 80-89%
  - C: 70-79%
  - D: 60-69%
  - F: Below 60%

### Academic Summary

The academic summary includes:
- Overall average across all subjects
- Subject-wise averages (weighted by assessment weights)
- All individual grades for the term
- Letter grades for each subject

### Report Card Generation

Report cards include:
- Student information
- Academic year and term details
- Overall average and letter grade
- Subject-wise performance
- Class rank (optional)
- Teacher/Principal remarks
- Status tracking (draft/published/archived)

### Class Rank Calculation

When `includeRank` is true, the system:
1. Finds the student's classroom offering for the academic year
2. Calculates averages for all classmates
3. Ranks students by average (descending)
4. Assigns rank to the report card

## Usage Examples

### 1. Setting Up Subjects

```bash
POST /schools/{schoolId}/subjects
{
  "name": "Mathematics",
  "code": "MATH",
  "description": "Basic mathematics and algebra"
}
```

### 2. Creating an Assessment

```bash
POST /schools/{schoolId}/assessments
{
  "termId": "term-uuid",
  "subjectId": "subject-uuid",
  "name": "Mid-Term Examination",
  "type": "exam",
  "maxScore": 100,
  "weight": 0.3,
  "assessmentDate": "2024-03-15T09:00:00Z"
}
```

### 3. Entering Grades (Bulk)
  "yearId": "year-uuid",
  "termTemplateItemId": "Term-Item-UUID",
  "classroomDefinitionId": "classroom-uuid",
POST /schools/{schoolId}/grades/bulk
{
  "assessmentId": "assessment-uuid",
  "grades": [
    {
      "studentId": "student-uuid-1",
      "score": 85.5,
      "remarks": "Good performance"
    },
    {
      "studentId": "student-uuid-2",
      "score": 92.0,
      "remarks": "Excellent work"
    }
  ]
}
```

### 4. Generating a Report Card

```bash
POST /schools/{schoolId}/report-cards
{
  "studentId": "student-uuid",
  "academicYearId": "year-uuid",
  "termId": "term-uuid",
  "includeRank": true,
  "autoPublish": false
}
```

### 5. Viewing Student Academic Summary

```bash
GET /students/{studentId}/results/summary?termId={termId}
```

## Database Migration

To apply the database changes, run:

```bash
npx prisma migrate dev --name add_academic_results_models
```

Or for production:

```bash
npx prisma migrate deploy
```

## Permissions

- **SCHOOL_ADMIN**: Full access to all endpoints
- **PARENT**: Can view their children's results and report cards (TODO: implement permission checks)

## Future Enhancements

1. **PDF Generation**: Implement PDF export for report cards using a library like `pdfkit` or `puppeteer`
2. **Parent Permissions**: Add checks to ensure parents can only view their own children's results
3. **Grade Scales**: Allow schools to customize letter grade thresholds
4. **Assessment Templates**: Pre-defined assessment templates for common types
5. **Grade Import**: Bulk import grades from Excel/CSV files
6. **Notifications**: Notify parents when report cards are published
7. **Analytics**: Class and school-wide performance analytics
8. **Grade History**: Track grade changes over time with audit logs

## Notes

- All grade calculations are done server-side for accuracy
- Assessments cannot be deleted if they have associated grades
- Report cards can be generated multiple times (creates new records)
- Only published report cards should be visible to parents (when parent permissions are implemented)

