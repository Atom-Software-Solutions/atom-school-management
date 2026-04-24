# Database Models - SchoolPay+

This document outlines all database models required for the SchoolPay+ multi-tenant payment platform.

## Table of Contents
- [Tenant Management Models](#tenant-management-models)
- [User & Role Models](#user--role-models)
- [Student Management Models](#student-management-models)
- [Fee & Billing Models](#fee--billing-models)
- [Payments Models](#payments-models)
- [Communication & Logging Models](#communication--logging-models)
- [Advanced/Optional Models](#advancedoptional-models)
- [Entity Relationships](#entity-relationships)

---

## Tenant Management Models

### School
Stores information about each school (tenant).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| name | String | Required | School name |
| code | String | Unique | Unique slug or code (e.g., "st-johns-primary") |
| email | String | Unique, Required | Contact email |
| phone | String | Required | Contact number |
| address | String | Optional | Physical address |
| logo_url | String | Optional | Logo or branding image URL |
| currency | String | Default: "UGX" | e.g., UGX, KES, TZS |
| time_zone | String | Default: "Africa/Kampala" | School time zone |
| is_active | Boolean | Default: true | Active status |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `code` (unique)
- `email` (unique)

**Relations:**
- Has many: Users, Students, FeeCategories, FeeStructures, Invoices (through Students), Payments (through Students), PaymentChannelConfigs, Notifications, AuditLogs

---

### SchoolSettings
Stores each school's configurations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id | Linked school |
| academic_terms | JSON | Optional | e.g., `{"Term 1": "Jan–Apr", "Term 2": "May–Aug", "Term 3": "Sep–Dec"}` |
| accepted_channels | JSON | Optional | Supported payment channels array |
| default_due_days | Integer | Default: 30 | Default invoice due duration in days |
| sms_enabled | Boolean | Default: true | Enable SMS notifications |
| email_enabled | Boolean | Default: true | Enable email notifications |
| auto_reminders | Boolean | Default: false | Enable automatic fee reminders |
| reminder_days_before | Integer | Default: 7 | Days before due date to send reminders |
| max_installments | Integer | Default: 1 | Maximum payment installments allowed |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id` (unique - one settings per school)

**Relations:**
- Belongs to: School

---

## User & Role Models

### User
General model for all users (admins, parents, students, super admins).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id, Nullable | Tenant scope (null for Super Admin) |
| first_name | String | Required | User's first name |
| last_name | String | Required | User's last name |
| email | String | Unique, Required | Login identifier |
| phone | String | Unique, Optional | Contact phone number |
| password_hash | String | Required | Hashed password (bcrypt) |
| role | Enum | Required | [SUPER_ADMIN, SCHOOL_ADMIN, PARENT, STUDENT] |
| is_active | Boolean | Default: true | Active status |
| email_verified | Boolean | Default: false | Email verification status |
| phone_verified | Boolean | Default: false | Phone verification status |
| two_factor_enabled | Boolean | Default: false | 2FA status |
| last_login | DateTime | Nullable | Last login timestamp |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id`
- `email` (unique)
- `phone` (unique, partial - only where not null)

**Relations:**
- Belongs to: School (optional)
- Has many: GuardianStudents (as guardian), Notifications, AuditLogs, Issued Receipts
- Has many: Students (as guardian)

**Notes:**
- SUPER_ADMIN has `school_id = null` for cross-tenant access
- Other roles are tenant-scoped

---

### Role (Optional RBAC Extension)
Detailed role-based access control system.

| Field | Type | Constraints | Description |
|-------| Unsupported output type:|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id | Tenant scope |
| name | String | Required | Role name (e.g., "Finance Officer") |
| description | String | Optional | Role description |
| permissions | JSON | Required | Key-value permission list |
| is_active | Boolean | Default: true | Active status |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id`
- `school_id + name` (unique composite)

**Relations:**
- Belongs to: School

**Example permissions:**
```json
{
  "fees": ["read", "create", "update"],
  "invoices": ["read", "create", "update", "delete"],
  "payments": ["read", "approve"],
  "reports": ["read"],
  "students": ["read", "create", "update"]
}
```

---

## Student Management Models

### Student
Core student information model.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id | Tenant link |
| student_code | String | Unique, Required | Unique student identifier |
| first_name | String | Required | Student's first name |
| last_name | String | Required | Student's last name |
| gender | Enum | Required | [M, F, Other] |
| dob enroll | DateTime | Required | Date of birth |
| class_name | String | Required | Current class |
| year | String | Required | Academic year (e.g., "2024") |
| guardian_id | UUID | Foreign Key → User.id | Primary parent/guardian |
| status | Enum | Default: Active | [Active, Alumni, Suspended, Transferred] |
| admission_date | DateTime | Required | Admission date |
| photo_url | String | Optional | Student photo |
| medical_notes | String | Optional | Medical information |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id`
- `student_code` (unique within school)
- `guardian_id`
- `school_id + student_code` (composite unique)

**Relations:**
- Belongs to: School, User (guardian)
- Has many: GuardianStudents, Invoices, Payments

---

### Guardian
Stores guardian (parent) information.

| Field      | Type    | Constraints                | Description                  |
|------------|---------|---------------------------|------------------------------|
| id         | UUID    | Primary Key               | Unique identifier            |
| first_name | String  | Required                  | Guardian's first name        |
| last_name  | String  | Required                  | Guardian's last name         |
| email      | String  | Unique, Optional          | Email address                |
| phone      | String  | Unique, Optional          | Phone number                 |
| created_at | DateTime| Auto                      | Record creation timestamp    |
| updated_at | DateTime| Auto                      | Record update timestamp      |
| school_id  | String  | Foreign Key → School.id   | Tenant link                  |

**Indexes:**
- `school_id`
- `email` (unique, partial)
- `phone` (unique, partial)

**Relations:**
- Has many: StudentGuardian (links to students)

---

### StudentGuardian
Many-to-many relationship between guardians and students.

| Field        | Type    | Constraints                        | Description                       |
|--------------|---------|-------------------------------------|-----------------------------------|
| id           | UUID    | Primary Key                        | Unique identifier                 |
| student_id   | UUID    | Foreign Key → Student.id           | Student reference                 |
| guardian_id  | UUID    | Foreign Key → Guardian.id          | Guardian reference                |
| relation     | String  | Optional                           | e.g., "Father", "Mother", etc.    |
| created_at   | DateTime| Auto                               | Record creation timestamp         |

**Indexes:**
- `student_id`
- `guardian_id`
- `student_id + guardian_id` (unique composite)

**Relations:**
- Belongs to: Student, Guardian

---

## Fee & Billing Models

### FeeCategory
Defines categories of school fees.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id | Tenant link |
| name | String | Required | Category name (e.g., "Tuition") |
| description | String | Optional | Category description |
| is_recurring | Boolean | Default: true | Recurring fee flag |
| is_active | Boolean | Default: true | Active status |
| display_order | Integer | Default: 0 | Display order for UI |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id`
- `school_id + name` (unique composite)

**Relations:**
- Belongs to: School
- Has many: FeeStructures

---

### FeeStructure
Defines how much each class pays per term/category.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id | Tenant link |
| term | String | Required | Term identifier (e.g., "Term 1") |
| class_name | String | Required | Target class |
| category_id | UUID | Foreign Key → FeeCategory.id | Fee category |
| amount | Decimal | Required | Fee amount |
| due_date | DateTime | Required | Payment due date |
| academic_year | String | Required | Academic year |
| is_active | Boolean | Default: true | Active status |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id`
- `category_id`
- `school_id + term + class_name + category_id` (composite unique)

**Relations:**
- Belongs to: School, FeeCategory

---

### Invoice
Issued to a student for a specific term.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id | Tenant link |
| student_id | UUID | Foreign Key → Student.id | Student reference |
| invoice_number | String | Unique, Required | Auto-generated invoice number |
| term | String | Required | Academic term |
| academic_year | String | Required | Academic year |
| total_amount | Decimal | Required | Total fee amount |
| amount_paid | Decimal | Default: 0 | Amount paid so far |
| amount_due | Decimal | Computed | Remaining amount (total_amount - amount_paid) |
| status | Enum | Default: Pending | [Pending, Partial, Paid, Overdue, Cancelled] |
| due_date | DateTime | Required | Payment due date |
| issued_date | DateTime | Auto | Invoice issue date |
| paid_date | DateTime | Nullable | Date fully paid |
| notes | String | Optional | Additional notes |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id`
- `student_id`
- `invoice_number` (unique)
- `status`
- `due_date`

**Relations:**
- Belongs to: School, Student
- Has many: Payments

**Note:**
- `amount_due` is a computed field: `total_amount - amount_paid`
- Status is automatically updated based on amounts

---

## Payments Models

### Payment
Stores transaction data.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id | Tenant link |
| student_id | UUID | Foreign Key → Student.id | Student reference |
| invoice_id | UUID | Foreign Key → Invoice.id | Related invoice |
| transaction_ref | String | Required | Gateway transaction reference |
| payment_code | String | Unique | Payment code/transaction ID |
| amount | Decimal | Required | Payment amount |
| channel | Enum | Required | [MTN, Airtel, Bank, Card, Cash] |
| status | Enum | Default: Pending | [Pending, Success, Failed, Cancelled, Refunded] |
| narration | String | Optional | Payment description |
| paid_at | DateTime | Nullable | Actual payment time |
| confirmed_at | DateTime | Nullable | Gateway confirmation time |
| callback_data | JSON | Optional | Gateway callback payload |
| failure_reason | String | Optional | Failure message if failed |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id`
- `student_id`
- `invoice_id`
- `transaction_ref` (unique)
- `payment_code` (unique)
- `status`

**Relations:**
- Belongs to: School, Student, Invoice
- Has one: Receipt

---

### PaymentChannelConfig
Per-tenant payment gateway settings.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID |ForeignKey → School.id | Tenant link |
| channel | Enum | Required | [MTN, Airtel, Bank, Card] |
| provider | String | Required | Gateway provider name |
| api_key | String | Encrypted | Encrypted API key |
| merchant_code | String | Optional | Merchant/business code |
| merchant_name | String | Optional | Merchant display name |
| callback_url | String | Optional | Webhook callback URL |
| success_url | String | Optional | Success redirect URL |
| failure_url | String | Optional | Failure redirect URL |
| is_active | Boolean | Default: true | Active status |
| test_mode | Boolean | Default: false | Test mode flag |
| config_data | JSON | Optional | Additional configuration |
| created_at | DateTime | Auto | Record creation timestamp |
| updated_at | DateTime | Auto | Record update timestamp |

**Indexes:**
- `school_id`
- `school_id + channel` (composite unique - one config per channel per school)

**Relations:**
- Belongs to: School

**Security Note:**
- Store `api_key` encrypted at rest
- Never log or expose in responses

---

### Receipt
Receipt issued for successful payment.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| payment_id | UUID | Foreign Key → Payment.id | Payment reference |
| receipt_number | String | Unique, Required | Auto-generated receipt number |
| issued_by | UUID | Foreign Key → User.id | User who issued receipt |
| issued_at | DateTime | Auto | Issuance timestamp |
| pdf_url | String | Optional | Receipt PDF URL |
| notes | String | Optional | Additional notes |
| created_at | DateTime | Auto | Record creation timestamp |

**Indexes:**
- `payment_id` (unique - one receipt per payment)
- `receipt_number` (unique)

**Relations:**
- Belongs to: Payment, User (issuer)

---

## Communication & Logging Models

### Notification
Notification messages sent to users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id | Tenant link |
| recipient_id | UUID | Foreign Key → User.id | Recipient user |
| type | Enum | Required | [SMS, Email, Push, InApp] |
| category | String | Optional | Notification category (e.g., "payment", "reminder") |
| subject | String | Optional | Notification subject |
| message | Text | Required | Notification content |
| status | Enum | Default: Pending | [Sent, Failed, Pending] |
| sent_at | DateTime | Nullable | Time sent |
| read_at | DateTime | Nullable | Time read (for InApp) |
| metadata | JSON | Optional | Additional data |
| created_at | DateTime | Auto | Record creation timestamp |

**Indexes:**
- `school_id`
- `recipient_id`
- `status`
- `type`

**Relations:**
- Belongs to: School, User

---

### AuditLog
Tracks key actions and changes for compliance and debugging.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Unique identifier |
| school_id | UUID | Foreign Key → School.id, Nullable | Tenant link (null for system-level actions) |
| user_id | UUID | Foreign Key → User.id | User who performed action |
| action | String | Required | Action performed (e.g., "Created invoice", "Approved payment") |
| entity | String | Required | Entity type (e.g., "Student", "Payment", "Invoice") |
| entity_id | UUID | Required | Entity identifier |
| old_value | JSON | Optional | Previous state |
| new_value | JSON | Optional | New state |
| ip_address | String | Optional | Request IP address |
| user_agent | String | Optional | Request user agent |
| timestamp | DateTime | Auto | Action timestamp |

**Indexes:**
- `school_id`
- `user_id`
- `entity + entity_id`
- `timestamp`

**Relations:**
- Belongs to: School (optional), User

**Retention Policy:**
- Keep logs for 2 years minimum
- Archive older logs for compliance

---

## Advanced/Optional Models

### SavingsWallet
Parent pre-payments and wallet functionality.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | |
| parent_id | UUID | Foreign Key → User.id | Parent user |
| school_id | UUID | Foreign Key → School.id | Tenant link |
| balance | Decimal | Default: 0 | Current wallet balance |
| currency | String | Default: "UGX" | Wallet currency |
| is_active | Boolean | Default: true | Active status |
| created_at | DateTime | Auto | |
| updated_at | DateTime | Auto | |

**Relations:**
- Belongs to: User, School
- Has many: WalletTransactions

---

### Subscription
SaaS subscription management for schools.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | |
| school_id | UUID | Foreign Key → School.id | Tenant link |
| plan | String | Required | Subscription plan |
| amount | Decimal | Required | Monthly/annual cost |
| status | Enum | | [Active, Suspended, Cancelled] |
| start_date | DateTime | | |
| end_date | DateTime | | |
| created_at | DateTime | Auto | |

---

## Entity Relationships

### Summary
```
School (1) ──∞ (0..*) User
School (1) ──∞ (1..*) Student
School (1) ──1 (1) SchoolSettings
User (1) ──∞ (0..*) GuardianStudent ∞── (1) Student
Student (1) ──∞ (0..*) Invoice
Invoice (1) ──∞ (1..*) Payment
Payment (1) ──1 (1) Receipt
School (1) ──∞ (0..*) FeeCategory
School (1) ──∞ (0..*) FeeStructure
FeeCategory (1) ──∞ (1..*) FeeStructure
School (1) ──∞ (0..*) PaymentChannelConfig
School (1) ──∞ (0..*) Notification
School (1) ──∞ (0..*) AuditLog
User (1) ──∞ (0..*) Notification
User (1) ──∞ (0..*) AuditLog
School (1) ──∞ (0..*) Guardian
Guardian (1) ──∞ (0..*) StudentGuardian ∞── (1) Student
Guardian (1) ──∞ (0..*) GuardianMessage
Student (1) ──∞ (0..*) GuardianMessage
```

### Cascade Rules
- Deleting School → Cascade delete all school-scoped records
- Deleting Student → Cascade delete Invoices and Payments
- Deleting Invoice → Cascade delete related Payments
- Deleting Payment → Cascade delete Receipt
- Deleting User → Set null on school_id where applicable
- Deleting Guardian → Cascade delete related StudentGuardian and optionally GuardianMessage records

### Data Integrity Rules
1. All tenant-scoped entities must have valid `school_id`
2. SUPER_ADMIN users must have `school_id = null`
3. Invoice status must be recalculated when payment is created/updated
4. Receipt can only be generated for successful payments
5. FeeStructure amount must be positive
6. Every Guardian must be linked to at least one Student via StudentGuardian.
7. GuardianMessage must reference a valid Guardian and School.

