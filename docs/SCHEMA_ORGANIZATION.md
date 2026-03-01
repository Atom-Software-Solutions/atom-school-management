# Database Schema Organization - SchoolPay+

This document shows how all models are organized into database schemas for logical separation and better performance.

## Schema Overview

The database uses **4 PostgreSQL schemas** to organize related models:

1. **`user_mgt`** - User and tenant management
2. **`student_mgt`** - Student and guardian data
3. **`fee_mgt`** - Fees, invoices, and billing
4. **`payment_mgt`** - Payment transactions and receipts

---

## Schema 1: `user_mgt` - User & Tenant Management

**Purpose:** Core tenant and user authentication/authorization

### Models:
- `Role` (enum)
- `School`
- `SchoolSettings`
- `User`
- `AuditLog` (optional, can be in separate `audit` schema)

**Rationale:**
- Centralized user authentication
- Tenant isolation starts here
- School configuration
- Security and compliance logging

---

## Schema 2: `student_mgt` - Student & Guardian Management

**Purpose:** Student data and guardian relationships

### Models:
- `Student`
- `GuardianStudent` (junction table)

**Rationale:**
- Student-specific data
- Guardian-student relationships
- Class and academic information
- Keeps student data separate from billing

---

## Schema 3: `fee_mgt` - Fee & Billing

**Purpose:** Fee structures, invoices, and billing

### Models:
- `FeeCategory`
- `FeeStructure`
- `Invoice`

**Rationale:**
- Fee configuration and invoicing
- Clear separation from payments
- Easier reporting on billing

---

## Schema 4: `payment_mgt` - Payments & Receipts

**Purpose:** Payment transactions, gateways, and receipts

### Models:
- `Payment`
- `PaymentChannelConfig`
- `Receipt`
- `PaymentTransaction` (optional, for complex payment tracking)

**Rationale:**
- All payment-related data in one place
- Gateway integration focused
- Receipt generation
- Can be replicated for analytics

---

## Additional Models by Schema

### Communication & Logging (can be in separate schemas)

**Option A: Keep studies)
```sql
-- In user_mgt schema
Notification
AuditLog
```

**Option B: Separate schemas**
```sql
-- Create new schemas
CREATE SCHEMA notification_mgt;
Notification → notification_mgt

CREATE SCHEMA audit_mgt;
AuditLog → audit_mgt
```

---

## Complete Schema Breakdown

### user_mgt Schema
```prisma
@@schema("user_mgt")

enum Role
model School
model SchoolSettings
model User
model AuditLog (optional)
model Notification (optional)
```

### student_mgt Schema
```prisma
@@schema("student_mgt")

model Student
model GuardianStudent
```

### fee_mgt Schema
```prisma
@@schema("fee_mgt")

model FeeCategory
model FeeStructure
model Invoice
```

### payment_mgt Schema
```prisma
@@schema("payment_mgt")

model Payment
model PaymentChannelConfig
model Receipt
model PaymentTransaction
```

---

## Cross-Schema References

Since models are in different schemas, you'll use **scalar fields** for foreign keys:

```prisma
// Student references User from user_mgt schema
model Student {
  guardian_id String  // Reference to user_mgt.User
  // No Prisma relation possible across schemas
}

// Invoice references Student from student_mgt
model Invoice {
  student_id String  // Reference to student_mgt.Student
}

// Payment references Invoice from fee_mgt
model Payment {
  invoice_id String  // Reference to fee_mgt.Invoice
}
```

---

## Updated Prisma Schema Organization

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = [
    "user_mgt",
    "student_mgt",
    "fee_mgt",
    "payment_mgt"
  ]
}

// ==========================================
// SCHEMA 1: USER & TENANT MANAGEMENT
// ==========================================

enum Role {
  SUPER_ADMIN
  SCHOOL_ADMIN
  PARENT
  STUDENT

  @@schema("user_mgt")
}

model School {
  id         String  @id @default(uuid())
  code       String  @unique
  name       String
  email      String
  phone      String
  address    String?
  logo_url   String?
  currency   String  @default("UGX")
  time_zone  String  @default("Africa/Kampala")
  is_active  Boolean @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relations
  users           User[]
  settings        SchoolSettings?
  notifications   Notification[]
  audit_logs      AuditLog[]
  students        Student[]
  fee_categories  FeeCategory[]
  invoices        Invoice[]
  payments        Payment[]
  
  @@schema("user_mgt")
}

model SchoolSettings {
  id                String  @id @default(uuid())
  school_id         String  @unique
  school            School  @relation(fields: [school_id], references: [id], onDelete: Cascade)
  academic_terms    Json?
  accepted_channels Json?
  default_due_days  Int     @default(30)
  sms_enabled       Boolean @default(true)
  email_enabled     Boolean @default(true)
  auto_reminders    Boolean @default(false)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  @@schema("user_mgt")
}

model User {
  id               String   @id @default(uuid())
  school_id        String?
  school           School?  @relation(fields: [school_id], references: [id], onDelete: SetNull)
  email            String   @unique
  phone            String?  @unique
  password_hash    String
  first_name       String
  last_name        String
  role             Role
  is_active        Boolean  @default(true)
  email_verified   Boolean  @default(false)
  two_factor_enabled Boolean @default(false)
  last_login       DateTime?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  @@index([school_id])
  @@index([email])
  @@schema("user_mgt")
}

model Notification {
  id           String   @id @default(uuid())
  school_id    String   // Reference to School
  recipient_id String   // Reference to User
  type         String   // SMS, Email, Push, InApp
  subject      String?
  message      String
  status       String   // Sent, Failed, Pending
  sent_at      DateTime?
  created_at   DateTime @default(now())

  @@index([school_id])
  @@index([recipient_id])
  @@schema("user_mgt")
}

model AuditLog {
  id         String   @id @default(uuid())
  school_id  String?
  user_id    String   // Reference to User
  action     String
  entity     String
  entity_id  String
  old_value  Json?
  new_value  Json?
  ip_address String?
  timestamp  DateTime @default(now())

  @@index([school_id])
  @@index([user_id])
  @@schema("user_mgt")
}

// ==========================================
// SCHEMA 2: STUDENT MANAGEMENT
// ==========================================

model Student {
  id             String   @id @default(uuid())
  school_id      String   // Reference to user_mgt.School
  student_code   String
  first_name     String
  last_name      String
  gender         String   // M, F, Other
  dob            DateTime
  class_name     String
  year           String
  guardian_id    String   // Reference to user_mgt.User
  status         String   // Active, Alumni, Suspended
  admission_date DateTime @default(now())
  photo_url      String?
  created_at     DateTime editor(now())
  updated_at     DateTime @updatedAt

  guardian_links GuardianStudent[]

  @@unique([school_id, student_code])
  @@index([school_id])
  @@index([guardian_id])
  @@schema("student_mgt")
}

model GuardianStudent {
  guardian_id         String @id // Reference to user_mgt.User
  student_id          String @id // Reference to Student
  student             Student @relation(fields: [student_id], references: [id], onDelete: Cascade)
  relationship        String?
  is_primary          Boolean @default(false)
  can_view_payments   Boolean @default(true)
  can_make_payments   Boolean @default(true)
  created_at          DateTime @default(now())

  @@schema("student_mgt")
}

//伤残==========================================
// SCHEMA 3: FEE & BILLING
// ==========================================

model FeeCategory {
  id           String   @id @default(uuid())
  school_id    String   // Reference to user_mgt.School
  name         String
  description  String?
  is_recurring Boolean  @default(true)
  is_active    Boolean  @default(true)
  display_order Int     @default(0)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  fee_structures FeeStructure[]

  @@unique([school_id, name])
  @@schema("fee_mgt")
}

model FeeStructure {
  id           String  @id @default(uuid())
  school_id    String  // Reference to user_mgt.School
  term         String
  class_name   String
  category_id  String  // Reference to FeeCategory
  category     FeeCategory @relation(fields: [category_id], references: [id], onDelete: Cascade)
  amount       Decimal @db.Decimal(10, 2)
  due_date     DateTime
  academic_year String
  is_active    Boolean @default(true)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@unique([school_id, term, class_name, category_id])
  @@schema("fee_mgt")
}

model Invoice {
  id             String   @id @default(uuid())
  school_id      String   // Reference to user_mgt.School
  student_id     String   // Reference to student_mgt.Student
  invoice_number String   @unique
  term           String
  academic_year  String
  total_amount   Decimal  @db.Decimal(10, 2)
  amount_paid    Decimal  @db.Decimal(10, 2) @default(0)
  amount_due     Decimal  @db.Decimal(10, 2) // Computed
  status         String   // Pending, Partial, Paid, Overdue
  due_date       DateTime
  issued_date    DateTime @default(now())
  paid_date      DateTime?
  notes          String?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  @@index([school_id])
  @@index([student_id])
  @@index([status])
  @@schema("fee_mgt")
}

// ==========================================
// SCHEMA 4: PAYMENT MANAGEMENT
// ==========================================

enum PaymentChannel {
  MTN
  Airtel
  Bank
  Card

  @@schema("payment_mgt")
}

enum PaymentStatus {
  Pending
  Success
  Failed
  Cancelled
  Refunded

  @@schema("payment_mgt")
}

model Payment {
  id             String   @id @default(uuid())
  school_id      String   // Reference to user_mgt.School
  student_id     String   // Reference to student_mgt.Student
  invoice_id     String   // Reference to fee_mgt.Invoice
  transaction_ref String  @unique
  payment_code   String   @unique
  amount         Decimal  @db.Decimal(10, 2)
  channel        PaymentChannel
  status         PaymentStatus @default(Pending)
  narration      String?
  paid_at        DateTime?
  confirmed_at   DateTime?
  callback_data  Json?
  failure_reason String?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  receipt        Receipt?

  @@index([school_id])
  @@index([student_id])
  @@index([invoice_id])
  @@index([status])
  @@schema("payment_mgt")
}

model PaymentChannelConfig {
  id             String   @id @default(uuid())
  school_id      String   // Reference to user_mgt.School
  channel        PaymentChannel
  provider       String
  api_key        String   // Encrypted
  merchant_code  String?
  merchant_name  String?
  callback_url   String?
  success_url    String?
  failure_url    String?
  is_active      Boolean  @default(true)
  test_mode      Boolean  @default(false)
  config_data    Json?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  @@unique([school_id, channel])
  @@schema("payment_mgt")
}

model Receipt {
  id             String   @id @default(uuid())
  payment_id     String   @unique // Reference to Payment
  payment        Payment  @relation(fields: [payment_id], references: [id], onDelete: Cascade)
  receipt_number String   @unique
  issued_by      String   // Reference to user_mgt.User
  issued_at      DateTime @default(now())
  pdf_url        String?
  notes          String?
  created_at     DateTime @default(now())

  @@schema("payment_mgt")
}
```

---

## Benefits of This Organization

1. **Performance:** Related queries stay in the same schema
2. **Scalability:** Can move schemas to different databases later
3. **Security:** Fine-grained permissions per schema
4. **Maintenance:** Clear separation of concerns
5. **Backup:** Can backup schemas independently

---

## Migration Strategy

When implementing this schema structure:

1. Create the new schemas
2. Add models to their respective schemas
3. Add indexes and constraints
4. Populate initial data
5. Update application code to use cross-schema references

