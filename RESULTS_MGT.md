# Results Management – End-to-End Manual Test Guide

This guide walks through all the HTTP calls needed to manually test the full academic results flow:

1. Create a `SCHOOL_ADMIN` user
2. Verify email and log in
3. Create a school and become its admin
4. Configure academic structure (terms, academic year, classrooms)
5. Create students and enroll them into a classroom
6. Create subjects and assessments
7. Capture grades
8. View student results and summaries
9. Generate and publish report cards

All examples assume the API is running at `http://localhost:3000`.

Use an HTTP client like Postman/Insomnia or `curl`.

---

## 0. Conventions

- **Base URL:** `http://localhost:3000`
- **Auth header:** `Authorization: Bearer <ACCESS_TOKEN>` on all protected endpoints
- All bodies are JSON unless noted.
- Store frequently used IDs from responses for later steps:
  - `schoolId`
  - `termTemplateId`, `yearId`, `termId`
  - `classroomDefinitionId`, `offeringId`
  - `studentId`
  - `subjectId`, `assessmentId`
  - `reportCardId`

---

## 1. Create a SCHOOL_ADMIN user

Self-registration always creates a `SCHOOL_ADMIN`.

### 1.1 Register

**Endpoint**

- `POST /auth/register`

**Request body**

```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "firstName": "Alice",
  "lastName": "Admin",
  "phone": "0700000000"
}
```

**Response (200)** – important fields

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": "<adminUserId>",
    "email": "admin@example.com",
    "firstName": "Alice",
    "lastName": "Admin",
    "role": "SCHOOL_ADMIN",
    "phone": "0700000000",
    "emailVerified": false
  }
}
```

> Note: A verification email is sent containing a token.

### 1.2 Verify email

Get the verification token from the email (or logs) and call:

**Endpoint**

- `GET /auth/verify-email?token=<VERIFICATION_TOKEN>`

**Response (200)**

```json
{ "message": "Email verified successfully" }
```

### 1.3 Login as SCHOOL_ADMIN

**Endpoint**

- `POST /auth/login`

**Request body**

```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200)**

```json
{
  "access_token": "<ACCESS_TOKEN>",
  "refresh_token": "<REFRESH_TOKEN>",
  "user": {
    "id": "<adminUserId>",
    "email": "admin@example.com",
    "role": "SCHOOL_ADMIN",
    "emailVerified": true,
    "firstName": "Alice",
    "lastName": "Admin",
    "phone": "0700000000"
  }
}
```

Use `<ACCESS_TOKEN>` in all subsequent steps as `Authorization: Bearer <ACCESS_TOKEN>`.

---

## 2. Create a School

You must verify the admin email (step 1.2) before a SCHOOL_ADMIN can create a school.

### 2.1 Create school

**Endpoint**

- `POST /schools`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body** (example)

```json
{
  "code": "SCH001",
  "name": "Atom High School",
  "domain": "atom-high-school",
  "email": "contact@atom-high.test",
  "phone": "0700000001",
  "address": "123 Main Street",
  "logoUrl": "https://example.com/logo.png",
  "currency": "UGX",
  "timeZone": "Africa/Kampala"
}
```

**Response (201)** – important fields

```json
{
  "id": "<schoolId>",
  "code": "SCH001",
  "name": "Atom High School",
  "domain": "atom-high-school",
  "email": "contact@atom-high.test",
  "phone": "0700000001",
  "currency": "UGX",
  "time_zone": "Africa/Kampala",
  "admins": [
    {
      "user": {
        "id": "<adminUserId>",
        "email": "admin@example.com"
      },
      "is_super_admin": true
    }
  ]
}
```

Record `schoolId`.

> After this, the user is linked as `SchoolAdmin` for this `schoolId`.

---

## 3. Configure Academic Structure (Terms & Years)

Before entering results you need:

- A **term template** for the school (defines Term 1, Term 2, etc.)
- An **academic year** using that template
- A **term** within that academic year (created automatically from the template)

### 3.1 Create a term template

**Endpoint**

- `POST /schools/{schoolId}/term-templates`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body** (3-term example)

```json
{
  "name": "Standard 3-Term Template",
  "structure": [
    { "ordinal": 1, "name": "Term 1" },
    { "ordinal": 2, "name": "Term 2" },
    { "ordinal": 3, "name": "Term 3" }
  ]
}
```

**Response (201)** – important fields

```json
{
  "id": "<termTemplateId>",
  "school_id": "<schoolId>",
  "name": "Standard 3-Term Template",
  "structure": [
    { "ordinal": 1, "name": "Term 1" },
    { "ordinal": 2, "name": "Term 2" },
    { "ordinal": 3, "name": "Term 3" }
  ],
  "is_locked": true
}
```

Record `termTemplateId`.

### 3.2 Create an academic year

**Endpoint**

- `POST /schools/{schoolId}/years`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{
  "name": "2025",
  "startDate": "2025-02-01T00:00:00.000Z",
  "endDate": "2025-11-30T23:59:59.999Z",
  "termTemplateId": "<termTemplateId>"
}
```

**Response (201)** – important fields

```json
{
  "id": "<yearId>",
  "school_id": "<schoolId>",
  "name": "2025",
  "status": "planned",
  "term_template_id": "<termTemplateId>"
}
```

Record `yearId`.

### 3.3 List terms for the academic year

**Endpoint**

- `GET /years/{yearId}/terms`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Response (200)** – example

```json
[
  {
    "id": "<term1Id>",
    "academic_year_id": "<yearId>",
    "ordinal": 1,
    "name": "Term 1",
    "start_date": "2025-02-01T00:00:00.000Z",
    "end_date": "2025-11-30T23:59:59.999Z"
  },
  {
    "id": "<term2Id>",
    "ordinal": 2,
    "name": "Term 2",
    "academic_year_id": "<yearId>"
  }
]
```

Pick one term to use for results, e.g. `termId = <term1Id>`.

### 3.4 (Optional but recommended) Activate the academic year

**Endpoint**

- `PATCH /years/{yearId}/status`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{ "status": "active" }
```

---

## 4. Configure Classrooms and Enroll Students

For report card ranking to work, students must be enrolled in a classroom offering for the same academic year.

### 4.1 Create a classroom definition

**Endpoint**

- `POST /schools/{schoolId}/classroom-definitions`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{
  "name": "Primary 7",
  "level": "Primary"
}
```

**Response (201)** – important field

```json
{
  "id": "<classroomDefinitionId>",
  "school_id": "<schoolId>",
  "name": "Primary 7",
  "level": "Primary"
}
```

### 4.2 Create a classroom offering for the academic year

**Endpoint**

- `POST /years/{yearId}/classroom-offerings`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{
  "classroomDefinitionId": "<classroomDefinitionId>",
  "displayName": "Primary 7 A"
}
```

**Response (201)** – important field

```json
{
  "id": "<offeringId>",
  "academic_year_id": "<yearId>",
  "classroom_definition_id": "<classroomDefinitionId>",
  "display_name": "Primary 7 A"
}
```

Record `offeringId`.

### 4.3 Create students

Students are created per school.

**Endpoint**

- `POST /students?schoolId={schoolId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body (Student 1)**

```json
{
  "studentNo": "STU001",
  "regNo": "REG001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@student.test",
  "phone": "0700000002"
}
```

**Response (201)** – important fields

```json
{
  "id": "<studentId1>",
  "school_id": "<schoolId>",
  "student_no": "STU001",
  "reg_no": "REG001",
  "first_name": "John",
  "last_name": "Doe"
}
```

Repeat for at least one more student (e.g. `STU002`) to test ranking.

### 4.4 Enroll students into the classroom offering

**Endpoint**

- `POST /classroom-offerings/{offeringId}/enrollments?schoolId={schoolId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body (for each student)**

```json
{
  "studentId": "<studentId1>",
  "startDate": "2025-02-01T00:00:00.000Z"
}
```

**Response (201)** – example

```json
{
  "id": "<enrollmentId>",
  "student_id": "<studentId1>",
  "classroom_offering_id": "<offeringId>",
  "academic_year_id": "<yearId>",
  "status": "active"
}
```

Repeat for each student you created.

---

## 5. Define Subjects

### 5.1 Create subjects for the school

**Endpoint**

- `POST /schools/{schoolId}/subjects`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body (example – Mathematics)**

```json
{
  "name": "Mathematics",
  "code": "MATH",
  "description": "Mathematics"
}
```

**Response (201)**

```json
{
  "id": "<subjectIdMath>",
  "school_id": "<schoolId>",
  "name": "Mathematics",
  "code": "MATH",
  "is_active": true
}
```

Repeat for another subject, e.g. English, and record `subjectIdEng`.

### 5.2 (Optional) List subjects

**Endpoint**

- `GET /schools/{schoolId}/subjects?includeInactive=false`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

Use this to confirm the subject IDs.

---

## 6. Create Assessments

Create at least one assessment per subject in the chosen term.

### 6.1 Create an assessment

**Endpoint**

- `POST /schools/{schoolId}/assessments`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body (example – Mid-Term for Mathematics)**

```json
{
  "termId": "<termId>",
  "subjectId": "<subjectIdMath>",
  "name": "Mid-Term Exam",
  "type": "exam",
  "maxScore": 100,
  "weight": 0.4,
  "assessmentDate": "2025-05-01T09:00:00Z"
}
```

**Response (201)** – important fields

```json
{
  "id": "<assessmentIdMathMid>",
  "school_id": "<schoolId>",
  "term_id": "<termId>",
  "subject_id": "<subjectIdMath>",
  "name": "Mid-Term Exam",
  "type": "exam",
  "max_score": "100.00",
  "weight": "0.40"
}
```

Repeat for other combinations you want (e.g. English Mid-Term with `weight: 0.4`, and maybe smaller tests with `weight: 0.1` each). Ensure the total weights per subject are sensible (they do not have to sum to 1, but they influence averages).

### 6.2 (Optional) List assessments

**Endpoint**

- `GET /schools/{schoolId}/assessments?termId={termId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

Use this to confirm `assessmentId` values.

---

## 7. Capture Grades

You can create grades one-by-one or in bulk. For manual testing, bulk creation is convenient.

### 7.1 Bulk create grades for an assessment

**Endpoint**

- `POST /schools/{schoolId}/grades/bulk`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body (example for Mathematics Mid-Term)**

```json
{
  "assessmentId": "<assessmentIdMathMid>",
  "grades": [
    {
      "studentId": "<studentId1>",
      "score": 85.5,
      "remarks": "Good performance"
    },
    {
      "studentId": "<studentId2>",
      "score": 92,
      "remarks": "Excellent"
    }
  ]
}
```

**Response (200)** – simplified

```json
{
  "created": 2,
  "failed": 0,
  "grades": [
    {
      "id": "<gradeId1>",
      "student_id": "<studentId1>",
      "assessment_id": "<assessmentIdMathMid>",
      "score": "85.50",
      "percentage": "85.50",
      "letter_grade": "B"
    },
    {
      "id": "<gradeId2>",
      "student_id": "<studentId2>",
      "score": "92.00",
      "percentage": "92.00",
      "letter_grade": "A"
    }
  ],
  "errors": []
}
```

Repeat for other assessments (e.g. English).

### 7.2 (Optional) Create / update a single grade

**Create single grade**

- `POST /schools/{schoolId}/grades`

```json
{
  "studentId": "<studentId1>",
  "assessmentId": "<assessmentIdMathMid>",
  "score": 78,
  "remarks": "Satisfactory"
}
```

**Update grade**

- `PATCH /schools/{schoolId}/grades/{gradeId}`

```json
{
  "score": 80,
  "remarks": "Updated after review"
}
```

---

## 8. View Student Results and Summary

Once grades are entered, you can fetch detailed results and summaries.

### 8.1 Detailed grades per student

**Endpoint**

- `GET /students/{studentId}/results?termId={termId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Example response (simplified)**

```json
[
  {
    "id": "<gradeId1>",
    "student_id": "<studentId1>",
    "score": "85.50",
    "percentage": "85.50",
    "letter_grade": "B",
    "assessment": {
      "id": "<assessmentIdMathMid>",
      "name": "Mid-Term Exam",
      "type": "exam",
      "weight": "0.40",
      "assessment_date": "2025-05-01T09:00:00.000Z",
      "subject": {
        "id": "<subjectIdMath>",
        "name": "Mathematics",
        "code": "MATH"
      }
    }
  }
]
```

You can also filter by `subjectId`:

- `GET /students/{studentId}/results?termId={termId}&subjectId={subjectIdMath}`

### 8.2 Academic summary for a term

**Endpoint**

- `GET /students/{studentId}/results/summary?termId={termId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Response (200)** – key structure

```json
{
  "student": {
    "id": "<studentId1>",
    "first_name": "John",
    "last_name": "Doe",
    "student_no": "STU001"
  },
  "term": {
    "id": "<termId>",
    "name": "Term 1",
    "ordinal": 1
  },
  "academicYear": {
    "id": "<yearId>",
    "name": "2025"
  },
  "overallAverage": 88.75,
  "overallLetterGrade": "B",
  "subjects": [
    {
      "subject": {
        "id": "<subjectIdMath>",
        "name": "Mathematics",
        "code": "MATH"
      },
      "average": 89.5,
      "letterGrade": "B",
      "grades": [
        { "id": "<gradeId1>", "percentage": "85.50" }
      ]
    }
  ],
  "totalSubjects": 2
}
```

Use this to confirm averages before generating report cards.

---

## 9. Generate a Report Card

### 9.1 Generate report card for a student and term

**Endpoint**

- `POST /schools/{schoolId}/report-cards`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{
  "studentId": "<studentId1>",
  "academicYearId": "<yearId>",
  "termId": "<termId>",
  "includeRank": true,
  "autoPublish": false
}
```

**Response (201)** – key structure

```json
{
  "id": "<reportCardId>",
  "school_id": "<schoolId>",
  "student_id": "<studentId1>",
  "academic_year_id": "<yearId>",
  "term_id": "<termId>",
  "overall_average": "88.75",
  "total_subjects": 2,
  "rank": 1,
  "total_students": 2,
  "status": "draft",
  "generated_at": "2025-06-01T10:00:00.000Z",
  "summary": {
    "overallAverage": 88.75,
    "overallLetterGrade": "B",
    "subjects": [
      {
        "subject": { "name": "Mathematics" },
        "average": 89.5,
        "letterGrade": "B"
      }
    ]
  }
}
```

> **Rank & total_students** will only be non-null if the student (and classmates) are enrolled in a classroom offering for this academic year with `status: active` (step 4.4).

### 9.2 Retrieve a report card with summary

**Endpoint**

- `GET /schools/{schoolId}/report-cards/{reportCardId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Response**

Same structure as above (report card + `summary`).

### 9.3 Publish a report card

If you did **not** set `autoPublish: true` when generating:

**Endpoint**

- `PATCH /schools/{schoolId}/report-cards/{reportCardId}/publish`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Response (200)** – key fields

```json
{
  "id": "<reportCardId>",
  "status": "published",
  "published_at": "2025-06-01T11:00:00.000Z"
}
```

### 9.4 List all report cards for a student

**Endpoint**

- `GET /students/{studentId}/report-cards`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Response (200)** – example

```json
[
  {
    "id": "<reportCardId>",
    "academic_year_id": "<yearId>",
    "term_id": "<termId>",
    "overall_average": "88.75",
    "status": "published"
  }
]
```

---

## 10. Optional: Set Up Guardians and (Future) Parent Access

There is partial support for guardians and parent users, but full parent-based access control for results is not yet complete.

### 10.1 Add a guardian for a student

**Endpoint**

- `POST /students/{studentId}/guardians`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{
  "firstName": "Grace",
  "lastName": "Parent",
  "email": "parent@example.com",
  "phone": "0700000003",
  "relation": "Mother"
}
```

This creates a `Guardian` record and links it to the student.

### 10.2 Create a PARENT user (for future use)

**Endpoint**

- `POST /users`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>` (SCHOOL_ADMIN for this `schoolId`)

**Request body**

```json
{
  "email": "parent@example.com",
  "password": "ParentPassword123!",
  "firstName": "Grace",
  "lastName": "Parent",
  "role": "PARENT",
  "phone": "0700000003",
  "schoolId": "<schoolId>"
}
```

> At the moment, the JWT payload does **not** assign a `school_id` for PARENT users, so `PARENT`-role access to results endpoints will fail authorization checks. See the next section for gaps.

---

## 11. Known Gaps / Crucial Missing or Implicit Steps

These are important considerations discovered while tracing the code that are **not fully covered** by the current public endpoints or behavior:

1. **Parent permissions for results**
   - `StudentResultsController` and `StudentReportCardsController` allow role `PARENT`, but `ResultsService.assertCanViewStudent` requires the authenticated user to:
     - Have a `school_id` matching the student’s school, and
     - Be linked via `Guardian` records.
   - `AuthService.getUserSchoolId` only infers `school_id` from `SchoolAdmin` relationships, not from guardians or other parent–school links.
   - **Effect:** even if you create a PARENT user and a Guardian with the same email, parent logins will still lack `school_id` and will be blocked from viewing results/report cards.
   - **Implication for manual testing:** run all results/report-card tests as `SCHOOL_ADMIN`. Parent flows are currently not testable end-to-end.

2. **Academic year and term dates**
   - When creating an academic year, term start/end dates are defaulted to the year bounds. There is no dedicated endpoint yet to adjust individual term dates.
   - This does not break results or report cards, but be aware if you later need precise term date ranges.

3. **Assessment and weight sanity**
   - The system does not enforce that per-subject assessment weights sum to `1.0`. Averages are computed as weighted sums divided by total weight.
   - For realistic manual tests, choose weights that make sense (e.g. exams heavier than class tests) and keep them consistent across students.

4. **Multi-tenancy expectations**
   - Many operations validate that the acting user is a `SchoolAdmin` of the involved `schoolId` (via `SchoolAdmin` table). Cross-tenant access is forbidden.
   - Ensure you:
     - Always use `schoolId` that belongs to the logged-in SCHOOL_ADMIN.
     - Re-login after creating a school if you later change roles or admin relationships.

5. **Report card PDF export and notifications**
   - The `ReportCard` model has a `pdf_url` field and there are notes about future PDF generation and notifications, but there is no public endpoint yet to generate/download PDFs or send publish notifications.
   - For now, treat report cards as JSON-only entities.

---

## 12. Quick Checklist for a Full Manual Test

Use this as a high-level checklist:

1. [ ] Register and verify a SCHOOL_ADMIN (`/auth/register`, `/auth/verify-email`, `/auth/login`)
2. [ ] Create a school (`POST /schools`) and record `schoolId`
3. [ ] Create term template (`POST /schools/{schoolId}/term-templates`) and record `termTemplateId`
4. [ ] Create academic year (`POST /schools/{schoolId}/years`) and record `yearId`
5. [ ] List terms (`GET /years/{yearId}/terms`) and choose `termId`
6. [ ] Create classroom definition (`POST /schools/{schoolId}/classroom-definitions`) and record `classroomDefinitionId`
7. [ ] Create classroom offering (`POST /years/{yearId}/classroom-offerings`) and record `offeringId`
8. [ ] Create at least two students (`POST /students?schoolId={schoolId}`) and record their `studentId`s
9. [ ] Enroll students into offering (`POST /classroom-offerings/{offeringId}/enrollments?schoolId={schoolId}`)
10. [ ] Create subjects (`POST /schools/{schoolId}/subjects`) and record `subjectId`s
11. [ ] Create assessments for each subject + term (`POST /schools/{schoolId}/assessments`) and record `assessmentId`s
12. [ ] Enter grades (`POST /schools/{schoolId}/grades/bulk` or `/grades`)
13. [ ] Verify raw grades (`GET /students/{studentId}/results?termId={termId}`)
14. [ ] Verify academic summary (`GET /students/{studentId}/results/summary?termId={termId}`)
15. [ ] Generate report card (`POST /schools/{schoolId}/report-cards`)
16. [ ] View report card and summary (`GET /schools/{schoolId}/report-cards/{reportCardId}`)
17. [ ] Publish report card (`PATCH /schools/{schoolId}/report-cards/{reportCardId}/publish`)
18. [ ] List student’s report cards (`GET /students/{studentId}/report-cards`)

If you complete all the above successfully, the results management flow—from SCHOOL_ADMIN and SCHOOL creation all the way to report card generation and publication—has been exercised end-to-end.