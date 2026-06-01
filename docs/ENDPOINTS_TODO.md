# API Endpoints Implementation Checklist - SchoolPay+

This document tracks the implementation status of all API endpoints.

Legend:
- ✅ Implemented
- ❌ Not implemented
- ⏳ In progress

---

## Authentication

- [x] `POST /auth/register` - Register a new user (automatically set to SCHOOL_ADMIN role, sends verification email)
- [x] `POST /auth/login` - Login with email and password
- [x] `POST /auth/logout` - Logout current user
- [x] `GET /auth/verify-email?token=xxx` - Verify email address using verification token
- [x] `POST /auth/refresh` - Refresh access token using refresh token
- [x] `POST /auth/forgot-password` - Request password reset
- [x] `POST /auth/reset-password` - Reset password with token
- [x] `GET /auth/profile` - Get current user profile (maps to GET /auth/me)

---

## School Management

- [x] `GET /schools` - List all schools (Super Admin only)
- [x] `POST /schools` - Create new school (School Admin only)
- [x] `GET /schools/:id` - Get school details (Super Admin or School Admin for their own school)
- [x] `PATCH /schools/:id` - Update school information (Super Admin or School Admin for their own school)
- [x] `DELETE /schools/:id` - Soft-delete school (Super Admin only - sets is_active=false and deleted_at timestamp)
- [x] `GET /schools/:id/settings` - Get school settings (Super Admin or School Admin for their own school)
- [x] `PATCH /schools/:id/settings` - Update school settings (Super Admin or School Admin for their own school)

---

## User Management

- [x] `GET /users` - List users (tenant-scoped)
- [x] `POST /users` - Create user (Admin, Parent, or Student)
- [x] `GET /users/:id` - Get user profile
- [x] `PATCH /users/:id` - Update user
- [x] `DELETE /users/:id` - Deactivate user (soft delete)
- [x] `POST /users/:id/reset-password` - Reset user password (admin action)

---

## Student Management

- [x] `GET /students?schoolId=:schoolId` - List students (School Admin only, tenant-scoped)
- [x] `POST /students?schoolId=:schoolId` - Add new student (School Admin only, tenant-scoped)
- [x] `GET /students/:id` - View student profile (School Admin only, tenant-scoped)
- [x] `PATCH /students/:id` - Update student information (School Admin only, tenant-scoped)
- [x] `PATCH /students/:id/identifiers` - Update studentNo/regNo (School Admin only, tenant-scoped)
- [x] `DELETE /students/:id` - Archive student (soft delete) (School Admin only, tenant-scoped)
- [x] `GET /students/:id/invoices` - Get student invoices (School Admin only, tenant-scoped)
- [x] `GET /students/:id/payments` - Get student payment history (School Admin only, tenant-scoped)
- [x] `GET /students/import/template` - Download .xlsx template (School Admin only)
- [x] `POST /students/import/validate?schoolId=:schoolId` - Validate .xlsx data (School Admin only, tenant-scoped)

---

## Guardian Management

- [x] `POST /students/:id/guardians` - Add guardian to student (School Admin only, tenant-scoped)
- [ ] `GET /students/:id/guardians` - List all guardians for a student
- [ ] `DELETE /students/:id/guardians/:guardianId` - Remove guardian from student
- [x] `PATCH /:id/guardians/:guardianId` - Update guardian details for a student
- [x] `GET /guardians` - List all guardians (school-wide)
- [x] `GET /guardians/:id` - Get guardian profile/details
- [x] `POST /guardians` - Create a new guardian and link to student(s)
  - Payload example:
    ```json
    {
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string",
      "students": ["studentId1", "studentId2"] // must be non-empty
    }
    ```
- [x] `PATCH /guardians/:id` - Update guardian profile
- [x] `DELETE /guardians/:id` - Archive/deactivate guardian
- [x] `PATCH /students/:studentId/guardians/:guardianId/set-primary` - Set a guardian as primary for a student (School Admin only)

---

## Guardian Messaging & Notifications

- [x] `POST /guardians/:id/messages` - Send message (email/SMS/WhatsApp) to guardian
- [x] `POST /students/:id/guardians/messages` - Send message to all guardians of a student
- [x] `POST /guardians/bulk-messages` - Send message to multiple guardians (by filter or list)
- [x] `GET /guardians/:id/messages` - List all messages sent to a guardian
- [x] `GET /guardians/:id/messages/:messageId` - Get details/status of a specific message to guardian

  - Messages can be academic (results, attendance, etc.) or general (fee reminders, announcements, etc.)
  - Support for multiple channels: Email, SMS, WhatsApp (future)


## Academic Calendar

- [x] `GET /schools/:schoolId/term-templates` - List term templates (immutable once used)
- [x] `POST /schools/:schoolId/term-templates` - Create term template (names and count)
- [x] `PATCH /schools/:schoolId/term-templates/:id` - Update term template (name and/or structure; locked templates preserve existing terms)
- [x] `PATCH /term-templates/:id/lock` - Lock template (auto-locked on first use)
- [x] `GET /schools/:schoolId/years` - List academic years
- [x] `POST /schools/:schoolId/years` - Create academic year (references a term template)
- [x] `GET /years/:yearId` - Get academic year details
- [x] `GET /years/:yearId/terms` - List terms instantiated for the year
- [x] `PATCH /years/:yearId/status` - Update year status (planned/active/closed)

---

## Classroom Management

- [x] `GET /schools/:schoolId/classroom-definitions` - List classroom definitions (school-defined names). Definitions include an `ordinal` integer used for promotion ordering.
- [x] `POST /schools/:schoolId/classroom-definitions` - Create classroom definition (name, level, ordinal)
- [x] `GET /classroom-definitions/:id` - Get single classroom definition by ID
- [x] `PATCH /classroom-definitions/:id` - Update classroom definition (rename, archive, ordinal)
- [x] `GET /years/:yearId/classroom-definitions` - List classroom definitions available for an academic year (definitions are used directly for enrollments)

---

## Enrollments & Student Progression

- [x] `POST /years/:yearId/classroom-definitions/:definitionId/enrollments` - Enroll student in a classroom definition for an academic year (creates an enrollment; specify `status` optionally).
  - Validation: a student **cannot** have more than one active enrollment in different classroom definitions for the same academic year. Attempts to create conflicting enrollments should return 409 Conflict.
- [x] `PATCH /enrollments/:id/status` - Update enrollment status (`pending` | `active` | `completed` | `withdrawn`). Only `active` enrollments are eligible to take classes/exams.
- [x] `PATCH /enrollments/:id/complete` - Complete/withdraw enrollment with endDate
- [x] `DELETE /enrollments/:id` - De-enroll student from a classroom definition (soft delete; reason recorded)
- [x] `GET /students/:studentId/enrollments/history` - Enrollment history for student
- [x] `POST /students/:studentId/promote` - Promote to next-year classroom definition (creates a pending placement; student must be actively enrolled to be eligible to take the class; cannot promote to the same classroom definition)
- [x] `POST /students/:studentId/retain` - Retain student (enroll into an allowed alternative; narration later)
- [ ] `POST /students/:studentId/promote-class` - Promote student from one class to another (if not already covered by `/students/:studentId/promote`)

---

## Academic Results & Grades

### Subject Management

- [x] `GET /schools/:schoolId/subjects` - List all subjects
- [x] `POST /schools/:schoolId/subjects` - Create a new subject
- [x] `GET /schools/:schoolId/subjects/:id` - Get subject details
- [x] `PATCH /schools/:schoolId/subjects/:id` - Update subject

### Assessment Management

- [x] `GET /schools/:schoolId/assessments` - List assessments (optional filters: termId, subjectId)
- [x] `POST /schools/:schoolId/assessments` - Create a new assessment
- [x] `GET /schools/:schoolId/assessments/:id` - Get assessment details
- [x] `PATCH /schools/:schoolId/assessments/:id` - Update assessment
- [x] `DELETE /schools/:schoolId/assessments/:id` - Delete assessment (only if no grades exist)

### Grade Management

- [x] `POST /schools/:schoolId/grades` - Create a single grade
- [x] `POST /schools/:schoolId/grades/bulk` - Bulk create grades for multiple students
- [x] `GET /schools/:schoolId/grades/:id` - Get grade details
- [x] `PATCH /schools/:schoolId/grades/:id` - Update grade
- [x] `DELETE /schools/:schoolId/grades/:id` - Delete grade

### Student Results

- [x] `GET /students/:studentId/results` - Get student's grades (optional filters: termId, subjectId)
- [x] `GET /students/:studentId/results/summary?termId=:termId` - Get academic summary for a term

### Report Cards

- [x] `POST /schools/:schoolId/report-cards` - Generate a new report card
- [x] `GET /schools/:schoolId/report-cards/:id` - Get report card details
- [x] `PATCH /schools/:schoolId/report-cards/:id/publish` - Publish a report card
- [x] `GET /students/:studentId/report-cards` - List all report cards for a student

---

## Fee & Billing

- [x] `GET /fees/categories` - List fee categories
- [x] `POST /fees/categories` - Create fee category
- [x] `GET /fees/structures` - List fee structures
- [x] `POST /fees/structures` - Create fee structure
- [x] `GET /invoices` - List invoices
- [x] `POST /invoices` - Create invoice
- [x] `GET /invoices/:id` - View invoice details
- [x] `PATCH /invoices/:id` - Update invoice
- [x] `POST /invoices/:id/cancel` - Cancel invoice

---

## Payments

- [ ] `GET /payments` - List payments
- [ ] `POST /payments/initiate` - Initiate payment request
- [ ] `POST /payments/:id/confirm` - Confirm/verify payment status
- [ ] `POST /payments/callback/:channel` - Receive payment gateway callback/webhook
- [ ] `GET /payments/:id` - Get payment details
- [ ] `GET /payments/:id/receipt` - Fetch or generate payment receipt
- [ ] `POST /payments/:id/receipt` - Generate receipt for successful payment
- [ ] `GET /payments/stats` - Get payment statistics
- [ ] `PATCH /payments/:id/reverse` - Reverse a payment (NEW)

---

## Notifications

- [ ] `GET /notifications` - List notifications for current user
- [ ] `POST /notifications/send` - Send notification (SMS, Email, or InApp)
- [ ] `GET /notifications/:id` - View notification details
- [ ] `PATCH /notifications/:id/read` - Mark notification as read
- [ ] `DELETE /notifications/:id` - Delete notification (NEW)

---

## Reporting & Analytics

- [ ] `GET /reports/financial` - Get financial summary
- [ ] `GET /reports/school/:id` - Get school-specific analytics (Super Admin)
- [ ] `GET /reports/student/:id` - Get student-level fee report
- [ ] `GET /reports/download` - Export reports in CSV or PDF format
- [ ] `GET /reports/attendance` - Attendance analytics (NEW)
- [ ] `GET /reports/performance` - Academic performance analytics (NEW)
- [x] `GET /dashboard/school/:schoolId` - Get dashboard summary for a school

---

## Integrations

- [ ] `GET /integrations/channels` - Get available payment channels for school
- [ ] `POST /integrations/channels` - Add new payment channel configuration
- [ ] `PATCH /integrations/channels/:id` - Update payment channel configuration
- [ ] `DELETE /integrations/channels/:id` - Remove payment channel integration
- [ ] `POST /integrations/webhooks` - Register callback URL for payment gateway
- [ ] `GET /integrations/webhooks` - List registered webhooks (NEW)

---

## Admin & Super Admin

- [ ] `GET /admin/overview` - System summary for all schools (Super Admin dashboard)
- [ ] `GET /admin/usage` - Resource usage per tenant
- [ ] `GET /admin/logs` - Audit logs
- [ ] `GET /admin/errors` - Error tracking list
- [ ] `POST /admin/impersonate/:userId` - Impersonate user (NEW)
- [ ] `GET /admin/roles` - List all roles (NEW)
- [x] `POST /admins/school` - Create a new School Admin (Super Admin only)
- [x] `GET /admins/school` - List all School Admins (Super Admin or School Admin for their own school)
- [x] `GET /admins/super` - List all Super Admins (Super Admin only)

---

## Health Check

- [x] `GET /api/health` - Health check
- [x] `GET /api` - Swagger Documentation

---

## Summary

- **Total Endpoints**: 123
- **Implemented**: 97
- **In Progress**: 0
- **Not Implemented**: 26
- **Completion**: 78.9%

---

## Notes

- This checklist should be updated as endpoints are implemented
- Mark completed endpoints with ✅
- Mark in-progress endpoints with ⏳
- Leave unmarked for not implemented




1. We need to split O-level (Senior 1 to Senior 4) from A-level (Senior 5 & Senior 6) since they are graded differently and have different subjects too.

2. Grading:
  - A-level: A, B, C, D, E
  - O-level: A, B, C, D, E

3. O-level subject breakdown:
  - ✅English Language                2 papers
  - ✅Literature in English           1 paper
  - ✅Mathematics                     2 papers
  - ✅Biology                         2 papers (Theory + Practical)
  - ✅Chemistry                       2 papers (Theory + Practical)
  - Physics                         2 papers (Theory + Practical)
  - ✅Geography                       1 paper
  - History & Political Education   1 paper
  - CRE / IRE                       1 paper
  - Kiswahili                       2 papers
  - Local Languages                 2 papers
  - Agriculture                     2 papers (Theory + Practical)
  - ICT / Computer Studies          2 papers (Theory + Practical)
  - Entrepreneurship                1 paper
  - Art & Design                    2 components (Theory + Practical/Project)
  - Performing Arts                 2 components
  - Nutrition & Food Technology     2 papers/components
  - Technology & Design             2 papers/components
  - Physical Education              Practical assessment + theory
  - Foreign Languages               Usually 2 papers

4. A-level subject breakdown:
  - General Paper                   1 paper
  - Mathematics                     2 papers (Pure + Applied)
  - Physics                         2 papers (Theory + Practical)
  - Chemistry                       2 papers (Theory + Practical)
  - Biology                         2 papers (Theory + Practical)
  - Agriculture                     2 components (Theory + Practical + Project)
  - Computer Studies / ICT          2 components (Theory + Practical)
  - Economics                       1 paper
  - Geography                       2 components (Theory + Fieldwork)
  - History                         1 paper
  - Divinity / CRE / IRE            1 paper
  - Entrepreneurship                1 paper
  - Literature in English           1 paper
  - English Language                1–2 components (Reading/Writing + Oral or continuous assessment)
  - Kiswahili / Foreign Languages   2–3 components (Paper 1 (Grammar/Composition) + Paper 2 (Comprehension/Literature) + Oral Test)
  - Art & Design                    2–3 components (Theory + Practical Coursework + Portfolio/Project)
  - Music / Performing Arts         3 components (Theory + Performance (Practical) + Composition/Project)
