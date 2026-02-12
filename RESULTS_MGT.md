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

## 4. CSV Bulk Import Endpoints

These endpoints allow school administrators to efficiently import student data from CSV files instead of creating students individually.

> **Note:** There are also XLSX template endpoints (`GET /students/import/template` for XLSX format). This section covers the CSV-specific import workflow. Choose either CSV or XLSX format based on your preference.

#### Template Types Available:
- **XLSX Template** (`GET /students/import/template`): Spreadsheet format - returns `.xlsx` file
- **CSV Template** (`GET /students/import/csv/template`): Comma-separated values - returns `.csv` file
- **CSV Validate** (`POST /students/import/csv/validate`): Validates CSV before import
- **CSV Import** (`POST /students/import/csv`): Performs the actual CSV import with auto-generated IDs

---

### 4.1 GET `/students/import/csv/template`

Downloads a CSV template file for bulk importing student data. Use this endpoint to get a CSV-formatted template.

**Alternative:** For XLSX (Excel spreadsheet) format, use `GET /students/import/template` instead.

**Authentication:**
- Required: JWT Bearer Token
- Role: SCHOOL_ADMIN

**Response:**
- **Status**: `200 OK`
- **Content-Type**: `text/csv`
- **File**: `students_template.csv`
- **Format**: CSV with comma-separated values

**Template Header Row:**
```csv
firstName,lastName,email,phone,gender,status,dateOfBirth,religion,address,className
```

**Purpose:**
Provides a properly formatted template ensuring users follow the correct CSV structure for imports via endpoint 4.3.

**Example Usage:**
```bash
curl -X GET http://localhost:3000/api/students/import/csv/template \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -o students_template.csv
```

---

### 4.2 POST `/students/import/csv/validate`

Validates a CSV file for correctness before importing. Returns detailed validation errors including row-by-row feedback.

**Authentication:**
- Required: JWT Bearer Token
- Role: SCHOOL_ADMIN

**Query Parameters:**
- `schoolId` (required): ID of the school to import students into

**Request Body:**
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (binary CSV file)

**File Validation Rules:**
- **Size Limit**: 5MB (configurable via `MAX_IMPORT_FILE_SIZE` env var)
- **File Extension**: Must be `.csv`
- **MIME Type**: `text/csv`, `application/csv`, or `text/plain`

**Response (200 OK - valid file):**
```json
{
  "valid": true,
  "errors": [],
  "total": 150,
  "processed": 150,
  "failed": 0
}
```

**Response (422 Unprocessable Entity - validation errors):**
```json
{
  "valid": false,
  "errors": [
    "Row 2: firstName is required",
    "Row 3: email is invalid",
    "Row 5: phone must be 10 digits",
    "Row 5: email already exists",
    "Row 5: phone already exists for this school",
    "Row 10: dateOfBirth must be a valid date (YYYY-MM-DD)"
  ],
  "total": 100,
  "processed": 100,
  "failed": 1
}
```

**CSV Field Specifications:**

| Field | Required | Validation | Description |
|-------|----------|-----------|-------------|
| `firstName` | Yes | Non-empty string | Student's first name |
| `lastName` | Yes | Non-empty string | Student's last name |
| `email` | No | RFC 5322 format + unique per school | Email address |
| `phone` | No | Exactly 10 digits + unique per school | Phone number |
| `gender` | No | Any string | Gender/sex identifier |
| `status` | No | Any string | Student status |
| `dateOfBirth` | No | ISO 8601 (YYYY-MM-DD) | Date of birth |
| `religion` | No | Any string | Religious affiliation |
| `address` | No | Any string | Residential address |
| `className` | No | Any string | Classroom name (auto-enrolls if exists) |

**Validation Logic:**
1. **Required Fields**: `firstName` and `lastName` must be present and non-empty
2. **Email**: Must match pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$` if provided
3. **Phone**: Must be exactly 10 digits if provided
4. **Date**: Must be a valid ISO 8601 date if provided
5. **Uniqueness**: Email and phone checked against file duplicates AND existing school records

**Example Usage:**
```bash
curl -X POST "http://localhost:3000/api/students/import/csv/validate?schoolId=school-123" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@students.csv"
```

---

### 4.3 POST `/students/import/csv`

Imports validated CSV data and creates student records. Each student receives auto-generated `studentNo` and `regNo`. Optionally enrolls students in classrooms if `className` is provided.

**Authentication:**
- Required: JWT Bearer Token
- Role: SCHOOL_ADMIN

**Query Parameters:**
- `schoolId` (required): ID of the school to import students into

**Request Body:**
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (binary CSV file)

**Response (201 Created):**
```json
{
  "imported": 148,
  "failed": 2,
  "errors": [
    "Row 15: email already exists",
    "Row 42: Failed to create enrollment for className \"Unrecognized Class\": classroom not found. Student imported without enrollment."
  ],
  "total": 150,
  "processed": 150
}
```

**Import Process:**

1. **File Validation**: Checks file size and type (same as 4.2)
2. **CSV Parsing**: RFC 4180 compliant CSV parsing with quoted field support
3. **Per-Row Processing**:
   - Validates required fields (`firstName`, `lastName`)
   - Validates optional field formats (email, phone, dates)
   - Checks uniqueness constraints against existing records
   - Auto-generates `studentNo` (format: `STU001`, `STU002`, etc.)
   - Auto-generates `regNo` (format: `REG001`, `REG002`, etc.)
   - Creates student record in database
4. **Optional Enrollment** (if `className` provided):
   - Finds or creates `ClassroomDefinition` by name
   - Locates active academic year (or most recent)
   - Finds or creates `ClassroomOffering` for that year
   - Creates `StudentEnrollment` linking student to classroom
   - **Note**: Enrollment errors don't block student creation

**Auto-Generation Details:**
- `studentNo`: Scanned from existing records, increments from max found
- `regNo`: Scanned from existing records, increments from max found
- **Retry Logic**: If collision occurs (concurrent imports), retries up to 5 times
- Guarantees uniqueness within school

**Error Handling:**
- Non-blocking: Individual row failures don't stop import
- Granular errors: Each error includes row number and specific issue
- Database constraints: Unique constraint violations caught and reported
- Enrollment issues: Logged as warnings but don't prevent student creation

**Sample CSV Content:**
```csv
firstName,lastName,email,phone,gender,status,dateOfBirth,religion,address,className
John,Doe,john.doe@example.com,1234567890,Male,active,2008-05-15,Christian,123 Main St,Form 4A
Jane,Smith,jane.smith@example.com,0987654321,Female,active,2009-03-20,Muslim,456 Oak Ave,Form 4A
Ahmed,Hassan,,0911223344,Male,active,2008-11-10,Muslim,789 Elm Rd,Form 3B
```

**Example Usage:**
```bash
curl -X POST "http://localhost:3000/api/students/import/csv?schoolId=school-123" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@students.csv"
```

**Response Example:**
```json
{
  "imported": 3,
  "failed": 0,
  "errors": [],
  "total": 3,
  "processed": 3
}
```

---

## 5. Configure Classrooms and Enroll Students

For report card ranking to work, students must be enrolled in a classroom offering for the same academic year.

### 5.1 Create a classroom definition

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


### 5.2 Classroom Offerings (Deprecated)

**Note:** As of February 2026, classroom offerings have been removed from the active API. Enrollments now operate **directly on classroom definitions** paired with academic years.

The concept of a "section" or "stream" (e.g. "Primary 7 A" vs "Primary 7 B") within a definition is now managed at the **definition level** or via custom metadata on the definition, not as a separate offering entity.

**For enrollment purposes:**
- Use `classroomDefinitionId` and `yearId` together to identify where a student enrolls.
- Create multiple `ClassroomDefinition` instances if you need distinct classes (e.g. "Primary 7 A" and "Primary 7 B" as separate definitions, both at the "Primary 7" level).

See section 5.4 for the new enrollment endpoint design.

### 5.3 Create students

Students can be created individually or via bulk CSV import (see section 4.3). When creating students you may supply either `studentId` (DB id) or identifiers `studentNo` / `regNo` in later enrollment requests.

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

### 5.4 Enroll students into a classroom definition

Enrollments now operate **directly on classroom definitions** (offerings layer has been removed). Use the classroom definition ID along with the academic year ID.

**Endpoint**

- `POST /years/{yearId}/classroom-definitions/{definitionId}/enrollments?schoolId={schoolId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{
  "studentId": "<studentId1>",
  "startDate": "2025-02-01T00:00:00.000Z"
}
```

**Behavior and fields:**
- `startDate` defaults to today if not provided.
- Enrollments automatically record `status: 'active'`.
- Each student can have at most one **active** enrollment per academic year.
- Students cannot return to the same classroom definition in a later academic year if they have already `completed` it.

**Response (201)** – example

```json
{
  "id": "<enrollmentId>",
  "student_id": "<studentId1>",
  "classroom_definition_id": "<classroomDefinitionId>",
  "academic_year_id": "<yearId>",
  "status": "active",
  "start_date": "2025-02-01T00:00:00.000Z",
  "end_date": null
}
```

### 5.4.1 Update enrollment status

**Endpoint**

- `PATCH /enrollments/{enrollmentId}/status?schoolId={schoolId}`

**Request body**

```json
{
  "status": "pending" | "active" | "completed" | "withdrawn"
}
```

**Response (200)** – example

```json
{
  "id": "<enrollmentId>",
  "status": "completed"
}
```

### 5.4.2 Complete or withdraw an enrollment

**Endpoint**

- `PATCH /enrollments/{enrollmentId}/complete?schoolId={schoolId}`

**Request body**

```json
{
  "endDate": "2025-11-30T23:59:59.999Z",
  "status": "completed" | "withdrawn"
}
```

**Response (200)** – example

```json
{
  "id": "<enrollmentId>",
  "status": "completed",
  "end_date": "2025-11-30T23:59:59.999Z"
}
```

### 5.4.3 Delete an enrollment

**Endpoint**

- `DELETE /enrollments/{enrollmentId}?schoolId={schoolId}&reason={reason}`

**Query Parameters:**
- `reason` (optional): Brief explanation for deletion

**Response (200)** – enrollment marked as deleted and withdrawn

### 5.5 Bulk enroll students (JSON)

**Endpoint**

- `POST /years/{yearId}/classroom-definitions/{definitionId}/enrollments/bulk?schoolId={schoolId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{
  "enrollments": [
    { "studentId": "<studentId1>", "startDate": "2025-02-01T00:00:00.000Z" },
    { "studentId": "<studentId2>", "startDate": "2025-02-01T00:00:00.000Z" },
    { "studentId": "<studentId3>" }
  ]
}
```

**Response (200)** – example

```json
{
  "created": 3,
  "failed": 0,
  "enrollments": [
    {
      "id": "<enrollmentId1>",
      "student_id": "<studentId1>",
      "classroom_definition_id": "<classroomDefinitionId>",
      "academic_year_id": "<yearId>",
      "status": "active",
      "start_date": "2025-02-01T00:00:00.000Z",
      "end_date": null
    },
    {
      "id": "<enrollmentId2>",
      "student_id": "<studentId2>",
      "classroom_definition_id": "<classroomDefinitionId>",
      "academic_year_id": "<yearId>",
      "status": "active",
      "start_date": "2025-02-01T00:00:00.000Z",
      "end_date": null
    },
    {
      "id": "<enrollmentId3>",
      "student_id": "<studentId3>",
      "classroom_definition_id": "<classroomDefinitionId>",
      "academic_year_id": "<yearId>",
      "status": "active",
      "start_date": "2025-02-09T00:00:00.000Z",
      "end_date": null
    }
  ],
  "errors": []
}
```

**Behavior:**
- Non-blocking: Individual student failures don't stop the bulk import.
- Each successful creation creates one active enrollment.
- If a student already has an active enrollment in the same academic year, that row will fail with an error.
- `startDate` defaults to today if omitted for a particular enrollment.

---

## 6. Define Subjects

### 6.1 Create subjects for the school

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

### 6.2 (Optional) List subjects

**Endpoint**

- `GET /schools/{schoolId}/subjects?includeInactive=false`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

Use this to confirm the subject IDs.

---

## 7. Create Assessments

Create at least one assessment per subject in the chosen term.

### 7.1 Create an assessment

**Endpoint**

- `POST /schools/{schoolId}/assessments`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body (example – Mid-Term for Mathematics)**

```json
{
  "yearId": "<yearId>",
  "termName": "Term 1",
  "subjectId": "<subjectIdMath>",
  "classroomDefinitionId": "<classroomDefinitionId>",
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
  "academic_year_id": "<yearId>",
  "term_name": "Term 1",
  "classroom_definition_id": "<classroomDefinitionId>",
  "subject_id": "<subjectIdMath>",
  "name": "Mid-Term Exam",
  "type": "exam",
  "max_score": "100.00",
  "weight": "0.40",
  "assessment_date": "2025-05-01T09:00:00.000Z",
  "is_published": false
}
```

Repeat for other combinations you want (e.g. English Mid-Term with `weight: 0.4`, and maybe smaller tests with `weight: 0.1` each). Ensure the total weights per subject are sensible (they do not have to sum to 1, but they influence averages).

### 7.2 (Optional) List assessments

**Endpoint**

- `GET /schools/{schoolId}/assessments?yearId={yearId}&termName={termName}&subjectId={subjectId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Query Parameters (all optional)**
- `yearId`: Filter by academic year ID
- `termName`: Filter by term name (should be paired with `yearId` for best results)
- `subjectId`: Filter by subject ID

**Response (200)** – example

```json
[
  {
    "id": "<assessmentIdMathMid>",
    "school_id": "<schoolId>",
    "academic_year_id": "<yearId>",
    "term_name": "Term 1",
    "subject_id": "<subjectIdMath>",
    "name": "Mid-Term Exam",
    "type": "exam",
    "max_score": "100.00",
    "weight": "0.40",
    "assessment_date": "2025-05-01T09:00:00.000Z",
    "subject": {
      "id": "<subjectIdMath>",
      "name": "Mathematics",
      "code": "MATH"
    }
  }
]
```

Use this to confirm `assessmentId` values.

---

## 8. Capture Grades

You can create grades one-by-one or in bulk. For manual testing, bulk creation is convenient.

### 8.1 Bulk create grades for an assessment

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

### 8.2 (Optional) Create / update a single grade

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

## 9. View Student Results and Summary

Once grades are entered, you can fetch detailed results and summaries.

### 9.1 Detailed grades per student

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

- `GET /students/{studentId}/results?yearId={yearId}&termName={termName}&subjectId={subjectIdMath}`

### 9.2 Academic summary for a term

**Endpoint**

- `GET /students/{studentId}/results/summary?yearId={yearId}&termName={termName}`

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

## 10. Generate a Report Card

### 10.1 Generate report card for a student and term

**Endpoint**

- `POST /schools/{schoolId}/report-cards`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Request body**

```json
{
  "studentId": "<studentId1>",
  "academicYearId": "<yearId>",
  "termName": "Term 1",
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

### 10.2 Retrieve a report card with summary

**Endpoint**

- `GET /schools/{schoolId}/report-cards/{reportCardId}`

**Headers**

- `Authorization: Bearer <ACCESS_TOKEN>`

**Response**

Same structure as above (report card + `summary`).

### 10.3 Publish a report card

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

### 10.4 List all report cards for a student

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
    "term_name": "Term 1",
    "overall_average": "88.75",
    "status": "published"
  }
]
```

---

## 11. Optional: Set Up Guardians and (Future) Parent Access

There is partial support for guardians and parent users, but full parent-based access control for results is not yet complete.

### 11.1 Add a guardian for a student

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

### 11.2 Create a PARENT user (for future use)

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

## 12. Known Gaps / Crucial Missing or Implicit Steps

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

## 13. Quick Checklist for a Full Manual Test

Use this as a high-level checklist:

1. [ ] Register and verify a SCHOOL_ADMIN (`/auth/register`, `/auth/verify-email`, `/auth/login`)
2. [ ] Create a school (`POST /schools`) and record `schoolId`
3. [ ] Create term template (`POST /schools/{schoolId}/term-templates`) and record `termTemplateId`
4. [ ] Create academic year (`POST /schools/{schoolId}/years`) and record `yearId`
5. [ ] List terms (`GET /years/{yearId}/terms`) and choose `termId`
6. [ ] Create classroom definition (`POST /schools/{schoolId}/classroom-definitions`) and record `classroomDefinitionId`
7. [ ] **[OPTIONAL]** Download CSV template (`GET /students/import/csv/template`)
8. [ ] **[OPTIONAL]** Validate CSV file (`POST /students/import/csv/validate?schoolId={schoolId}`)
9. [ ] **[OPTIONAL]** Import students via CSV (`POST /students/import/csv?schoolId={schoolId}`) OR create manually via `POST /students?schoolId={schoolId}` and record their `studentId`s
10. [ ] Enroll students into the classroom definition:
    - **SINGLE** `POST /years/{yearId}/classroom-definitions/{definitionId}/enrollments?schoolId={schoolId}` — enroll one student
    - **BULK** `POST /years/{yearId}/classroom-definitions/{definitionId}/enrollments/bulk?schoolId={schoolId}` — bulk enroll multiple students
11. [ ] Create subjects (`POST /schools/{schoolId}/subjects`) and record `subjectId`s
12. [ ] Create assessments for each subject + term (`POST /schools/{schoolId}/assessments`) and record `assessmentId`s
13. [ ] Enter grades (`POST /schools/{schoolId}/grades/bulk` or `/grades`)
14. [ ] Verify raw grades (`GET /students/{studentId}/results?termId={termId}`)
15. [ ] Verify academic summary (`GET /students/{studentId}/results/summary?termId={termId}`)
16. [ ] Generate report card (`POST /schools/{schoolId}/report-cards`)
17. [ ] View report card and summary (`GET /schools/{schoolId}/report-cards/{reportCardId}`)
18. [ ] Publish report card (`PATCH /schools/{schoolId}/report-cards/{reportCardId}/publish`)
19. [ ] List student's report cards (`GET /students/{studentId}/report-cards`)

If you complete all the above successfully, the results management flow—from SCHOOL_ADMIN and SCHOOL creation all the way to report card generation and publication—has been exercised end-to-end.


 - We need to set remarks in the DB such that we don't need to manually set them when we are entering grades for assessments as below.

"95 – 100 → Outstanding
90 – 94.99 → Excellent 
85 – 89.99 → Good performance 
75 – 84.99 → Very good
65 – 74.99 → Good
50 – 64.99 → Satisfactory
40 – 49.99 → Needs improvement
Below 40 → Poor"

 - 