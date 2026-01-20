# API Endpoints - SchoolPay+

Complete API endpoint documentation organized by resource.

## Table of Contents
- [Authentication](#authentication)
- [School Management](#school-management)
- [User Management](#user-management)
- [Student Management](#student-management)
- [Fee & Billing](#fee--billing)
- [Payments](#payments)
- [Notifications](#notifications)
- [Reporting & Analytics](#reporting--analytics)
- [Integrations](#integrations)
- [Admin & Super Admin](#admin--super-admin)

---

## Authentication

### POST `/auth/register`
Register a new user (Parent or School Admin).

**Request Body:**
```typescript
{
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  role: "SCHOOL_ADMIN" | "PARENT";
  school_code?: string; // Required if role is PARENT
}
```

**Response:** `201 Created`
```typescript
{
  id: string;
  email: string;
  role: string;
  message: "User registered successfully";
}
```

**Permissions:** Public

---

### POST `/auth/login`
Login with email and password.

**Request Body:**
```typescript
{
  email: string;
  password: string;
  remember_me?: boolean;
}
```

**Response:** `200 OK`
```typescript
{
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    school_id?: string;
    first_name: string;
    last_name: string;
  };
}
```

**Permissions:** Public

---

### POST `/auth/logout`
Logout current user.

**Headers:**
- `Authorization: Bearer <token>`

**Response:** `200 OK`
```typescript
{
  message: "Logged out successfully";
}
```

**Permissions:** Authenticated

---

### POST `/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```typescript
{
  refresh_token: string;
}
```

**Response:** `200 OK`
```typescript
{
  access_token: string;
  refresh_token: string;
}
```

**Permissions:** Public (with valid refresh token)

---

### POST `/auth/forgot-password`
Request password reset.

**Request Body:**
```typescript
{
  email: string;
}
```

**Response:** `200 OK`
```typescript
{
  message: "Password reset instructions sent to email";
}
```

**Permissions:** Public

---

### POST `/auth/reset-password`
Reset password with token.

**Request Body:**
```typescript
{
  token: string;
  new_password: string;
}
```

**Response:** `200 OK`
```typescript
{
  message: "Password reset successfully";
}
```

**Permissions:** Public (with valid token)

---

### GET `/auth/me`
Get current user profile.

**Headers:**
- `Authorization: Bearer <token>`

**Response:** `200 OK`
```typescript
{
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  school_id?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}
```

**Permissions:** Authenticated

---

## School Management

### GET `/schools`
List all schools (Super Admin only).

**Query Parameters:**
- `page?: number` (default: 1)
- `limit?: number` (default: 20)
- `search?: string` (search by name or code)
- `is_active?: boolean`

**Response:** `200 OK`
```typescript
{
  data: School[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: Prophet_pb2
```OnNumber: number;
  };
}
```

**Permissions:** SUPER_ADMIN

---

### POST `/schools`
Create new school.

**Request Body:**
```typescript
{
  name: string;
  code: string;
  email: string;
  phone: string;
  address?: string;
  logo_url?: string;
  currency?: string;
  time_zone?: string;
}
```

**Response:** `201 Created防御`Collect {
  ...School;
}
```

**Permissions:** SUPER_ADMIN

---

### GET `/schools/:id`
Get school details.

**Response:** `200 OK`
```typescript
{
  ...School;
  settings?: SchoolSettings;
}
```

**Permissions:** 
- SUPER_ADMIN (any school)
- SCHOOL_ADMIN (own school only)

---

### PATCH `/schools/:id`
Update school information.

**Request Body:** (all fields optional)
```typescript
{
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  currency?: string;
  time_zone?: string;
  is_active?: boolean;
}
```

**Response:** `200 OK`
```typescript
{
  ...School;
}
```

**Permissions:** 
- SUPER_ADMIN (any school)
- SCHOOL_ADMIN (own school only)

---

### DELETE `/schools/:id`
Archive/soft-delete school.

**Response:** `200 OK`
```typescript
{
  message: "School archived successfully";
}
```

**Permissions:** SUPER_ADMIN

---

### GET `/schools/:id/settings`
Get school settings.

**Response:** `200 OK`
```typescript
{
  ...SchoolSettings;
}
```

**Permissions:** 
- SUPER_ADMIN (any school)
- SCHOOL_ADMIN (own school only)

---

### PATCH `/schools/:id/settings`
Update school settings.

**Request Body:** (all fields optional)
```typescript
{
  academic_terms?: JSON;
  accepted_channels?: string[];
  default_due_days?: number;
  sms_enabled?: boolean;
  email_enabled?: boolean;
  auto_reminders?: boolean;
  reminder_days_before?: number;
  max_installments?: number;
}
```

**Response:** `200 OK`
```typescript
{
  ...SchoolSettings;
}
```

**Permissions:** SCHOOL_ADMIN (own school only)

---

## User Management

### GET `/users`
List users (tenant-scoped).

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `role?: string`
- `search?: string`
- `is_active?: boolean`

**Response:** `200 OK`
```typescript
{
  data: User[];
  meta: PaginationMeta;
}
```

**Permissions:** 
- SUPER_ADMIN (all users)
- SCHOOL_ADMIN (own school users only)

---

### POST `/users`
Create user (Admin, Parent, or Student).

**Request Body:**
```typescript
{
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: "SCHOOL_ADMIN" | "PARENT" | "STUDENT";
  password?: string; // Optional, auto-generated if not provided
  guardian_id?: string; // Required if role is STUDENT
  send_invite?: boolean; // Send invitation email
}
```

**Response:** `201 Created`
```typescript
{
  ...User;
}
```

**Permissions:** 
- SUPER_ADMIN (any role)
- SCHOOL_ADMIN (PARENT and STUDENT only)

---

### GET `/users/:id`
Get user profile.

**Response:** `200 OK`
```typescript
{
  ...User;
}
```

**Permissions:** 
- User can view own profile
- School Admin can view users in their school
- Super Admin can view any user

---

### PATCH `/users/:id`
Update user.

**Request Body:** (all fields optional)
```typescript
{
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}
```

**Response:** `200 OK`
```typescript
{
  ...User;
}
 are```
```QUESTIONS: Required permissions

---

### DELETE `/users/:id`
Deactivate user (soft delete).

**Response:** `200 OK`
```typescript
{
  message: "User deactivated successfully";
}
```

**Permissions:** 
- SUPER_ADMIN
- SCHOOL_ADMIN (own school only)

---

### POST `/users/:id/reset-password`
Reset user password (admin action).

**Request Body:**
```typescript
{
  new_password: string;
  send_email?: boolean;
}
```

**Response:** `200 OK`
```typescript
{
  message: "Password reset successfully";
}
```

**Permissions:** SUPER_ADMIN, SCHOOL_ADMIN

---

## Student Management

### GET `/students`
List students (tenant-scoped).

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `class_name?: string`
- `status?: string`
- `search?: string`
- `guardian_id?: string` (filter by guardian)

**Response:** `200 OK`
```typescript
{
  data: Student[];
  meta: PaginationMeta;
}
```

**Permissions:** 
- SUPER_ADMIN (all schools)
- SCHOOL_ADMIN (own school)
- PARENT (own children only)

---

### POST `/students`
Add new student.

**Request Body:**
```typescript
{
  // NOTE: `studentNo` and `regNo` are AUTO-GENERATED by the backend.
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string; // 10 digits
  gender?: string;
  status?: string;
  dateOfBirth?: string; // ISO date
  religion?: string;
  address?: string;
  avatarUrl?: string;
}
```

**Response:** `201 Created`
```typescript
{
  ...Student;
}
```

**Permissions:** SCHOOL_ADMIN

**Query Parameters:**
- `schoolId: string` (required)

---

### GET `/students/:id`
View student profile.

**Response:** `200 OK`
```typescript
{
  ...Student;
  guardian: User;
  invoices?: Invoice[];
  payments?: Payment[];
}
```

**Permissions:** 
- SUPER_ADMIN
- SCHOOL_ADMIN (own school)
- PARENT (own children only)

---

### PATCH `/students/:id`
Update student information.

**Request Body:** (all fields optional)
```typescript
{
  first_name?: string;
  last_name?: string;
  gender?: string;
  class_name?: string;
  year?: string;
  guardian_id?: string;
  status?: string;
  photo_url?: string;
  medical_notes?: string;
}
```

**Response:** `200 OK`
```typescript
{
  ...Student;
}
```

**Permissions:** SCHOOL_ADMIN

---

### DELETE `/students/:id`
Archive student (soft delete).

**Response:** `200 OK`
```typescript
{
  message: "Student archived successfully";
}
```

**Permissions:** SCHOOL_ADMIN

---

### GET `/students/:id/invoices`
Get student invoices.

**Query Parameters:**
- `status?: string`
- `term?: string`
- `year?: string`

**Response:** `200 OK`
```typescript
{
  data: Invoice[];
}
```

**Permissions:** See GET `/students/:id`

---

### GET `/students/:id/payments`
Get student payment history.

**Query Parameters:**
- `status?: string`
- `channel?: string`
- `start_date?: string`
- `end_date?: string`

**Response:** `200 OK`
```typescript
{
  data: Payment[];
}
```

**Permissions:** See GET `/students/:id`

---

### POST `/students/:id/guardians`
Add guardian to student.

**Request Body:**
```typescript
{
  guardian_id: string;
  relationship?: string;
  is_primary?: boolean;
  can_view_payments?: boolean;
  can_make_p declinements?: boolean;
}
```

**Response:** `201 Created`
```typescript
{
  guardian_id: string;
  student_id: string;
  relationship: string;
  is_primary: boolean;
}
```

**Permissions:** SCHOOL_ADMIN

---

## Fee & Billing

### GET `/fees/categories`
List fee categories.

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `is_active?: boolean`

**Response:** `200 OK`
```typescript
{
  data: FeeCategory[];
  meta: PaginationMeta;
}
```

**Permissions:** 
- SUPER_ADMIN
- SCHOOL_ADMIN (own school)

---

### POST `/fees/categories`
Create fee category.

**Request Body:**
```typescript
{
  name: string;
  description?: string;
  is_recurring?: boolean;
  display_order?: number;
}
```

**Response:** `201 Created`
```typescript
{
  ...FeeCategory;
}
```

**Permissions:** SCHOOL_ADMIN

---

### GET `/fees/structures`
List fee structures.

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `term?: string`
- `class_name?: string`
- `year?: string`
- `is_active?:ales`

**Response:** `200 OK`
```typescript
{
  data: FeeStructure[];
  meta: PaginationMeta;
}
```

**Permissions:** See GET `/fees/categories`

---

### POST `/fees/structures`
Create fee structure.

**Request Body:**
```typescript
{
  term: string;
  class_name: string;
  category_id: string;
  amount: number;
  due_date: string; // ISO date
  academic_year: string;
}
```

**Response:** `201 Created`
```typescript
{
  ...FeeStructure;
}
```

**Permissions:** SCHOOL_ADMIN

---

### GET `/invoices`
List invoices.

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `status?: string`
- `student_id?: string`
- `term?: string`
- `year?: string`

**Response:** `200 OK`
```typescript
{
  data: Invoice[];
  meta: PaginationMeta;
}
```

**Permissions:** 
- SUPER_ADMIN (all)
- SCHOOL_ADMIN (own school)
- PARENT (own children)

---

### POST `/invoices`
Create invoice.

**Request Body:**
```typescript
{
  student_id: string;
  term: string;
  academic_year: string;
  due_date: string; // ISO date
  total_amount: number;
  notes?: string;
}
```

**Response:** `201 Created`
```typescript
{
  ...Invoice;
}
```

**Permissions:** SCHOOL_ADMIN

---

### GET `/invoices/:id`
View invoice details.

**Response:** `200 OK`
```typescript
{
  ...Invoice;
  student: Student;
  payments: Payment[];
}
```

**Permissions:** See GET `/invoices`

---

### PATCH `/invoices/:id`
Update invoice.

**Request Body:** (all fields optional)
```typescript
{
  status?: string;
  due_date?: string;
  notes?: string;
  total_amount?: number;
}
```

**Response:** `200 OK`
```typescript
{
  ...Invoice;
}
```

**Permissions:** SCHOOL_ADMIN

---

### POST `/invoices/:id/cancel`
Cancel invoice.

**Request Body:**
```typescript
{
  reason?: string;
}
```

**Response:** `200 OK`
```typescript
{
  ...Invoice; // status updated to 'Cancelled'
}
```

**Permissions:** SCHOOL_ADMIN

---

## Payments

### GET `/payments`
List payments.

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `status?: string`
- `channel?: string`
- `student_id?: string`
- `invoice_id?: string`
- `start_date?: string`
- `end_date?: string`

**Response:** `200 OK`
```typescript
{
  data: Payment[];
  meta: PaginationMeta;
}
```

**Permissions:** See GET `/invoices`

---

### POST `/payments/initiate`
Initiate payment request.

**Request Body:**
```typescript
{
  invoice_id: string;
  amount: number;
  channel: "MTN" | "Airtel" | "Bank" | "Card";
  narration?: string;
}
```

**Response:** `201 Created`
```typescript
{
  payment_id: string;
  transaction_ref: string;
  payment_code: string;
  payment_url?: string; // For web redirect
  instructions?: string; // For USSD/Mobile Money
  status: "Pending";
}
```

**Permissions:** 
- SCHOOL_ADMIN
- PARENT

---

### POST `/payments/:id/confirm`
Confirm/verify payment status.

**Headers:**
- `Authorization: Bearer <token>` (optional, required for manual confirmation)

**Response:** `200 OK`
```typescript
{
  ...Payment;
  invoice_updated: boolean;
}
```

**Permissions:** 
- Automatic (from gateway callback)
- Manual: SCHOOL_ADMIN

---

### POST `/payments/callback/:channel`
Receive payment gateway callback/webhook.

**Request Body:** (varies by payment channel)
```typescript
{
  // Channel-specific payload
}
```

**Response:** `200 OK`
```typescript
{
  received: true;
}
```

**Permissions:** Public (with webhook verification)

---

### GET `/payments/:id`
Get payment details.

**Response:** `200 OK`
```typescript
{
  ...Payment;
  student: Student;
  invoice: Invoice;
  receipt?: Receipt;
}
```

**Permissions:** See GET `/payments`

---

### GET `/payments/:id/receipt`
Fetch or generate payment receipt.

**Query Parameters:**
- `format?: "pdf" | "json"` (default: pdf)

**Response:** `200 OK`
```typescript
// PDF: binary data
// JSON: { ...Receipt }
```

**Permissions:** 
- SCHOOL_ADMIN
- PARENT (own children)

---

### POST `/payments/:id/receipt`
Generate receipt for successful payment.

**Response:** `201 Created`
```typescript
{
  ...Receipt;
  pdf_url: string;
}
```

**Permissions:** SCHOOL_ADMIN

---

### GET `/payments/stats`
Get payment statistics.

**Query Parameters:**
- `period?: "today" | "week" | "month" | "year"`
- `start_date?: string`
- `end_date?: string`
- `student_id?: string`

**Response:** `200 OK`
```typescript
{
  total_amount: number;
  total_count: number;
  by_channel: {
    MTN: number;
    Airtel: number;
    Bank: number;
    Card: number;
  };
  by_status: {
    Pending: number;
    Success: number;
    Failed: number;
  };
  trends: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
}
```

**Permissions:** 
- SUPER_ADMIN (all schools)
- SCHOOL_ADMIN (own school)
- PARENT (own children)

---

## Notifications

### GET `/notifications`
List notifications for current user.

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `type?: string`
- `status?: string`
- `unread_only?: boolean`

**Response:** `200 OK`
```typescript
{
  data: Notification[];
  meta: PaginationMeta;
}
```

**Permissions:** Authenticated (own notifications)

---

### POST `/notifications/send`
Send notification (SMS, Email, or InApp).

**Request Body:**
```typescript
{
  recipient_id: string;
  type: "SMS" | "Email" | "InApp";
  subject?: string;
  message: string;
  category?: string;
  metadata?: JSON;
}
```

**Response:** `201 Created`
```typescript
{
  ...Notification;
}
```

**Permissions:** SCHOOL_ADMIN

---

### GET `/notifications/:id`
View notification details.

**Response:** `200 OK`
```typescript
{
  ...Notification;
}
```

**Permissions:** Authenticated (own notification)

---

### PATCH `/notifications/:id/read`
Mark notification as read.

**Response:** `200 OK`
```typescript
{
  message: "Notification marked as read";
}
```

**Permissions:** Authenticated (own notification)

---

## Reporting & Analytics

### GET `/reports/financial`
Get financial summary.

**Query Parameters:**
- `period?: "today" | "week" | "month" | "year"`
- `start_date?: string`
- `end_date?: string`

**Response:** `200 OK`
```typescript
{
  total_revenue: number;
  total_received: number;
  outstanding_balance: number;
  by_invoice_status: {
    Pending: number;
    Partial: number;
    Paid: number;
    Overdue: number;
  };
  by_payment_channel: Record<string, number>;
  top_students: Array<{
    student_id: string;
    student_name: string;
    amount_paid: number;
  }>;
}
```

**Permissions:** 
- SUPER_ADMIN (all schools)
- SCHOOL_ADMIN (own school)

---

### GET `/reports/school/:id`
Get school-specific analytics (Super Admin).

**Query Parameters:**
- `period?: string`
- `start_date?: string`
- `end_date?: string`

**Response:** `200 OK`
```typescript
{
  ...FinancialReport;
  student_count: number;
  invoice_count: number;
  payment_count: number;
}
```

**Permissions:** SUPER_ADMIN

---

### GET `/reports/student/:id`
Get student-level fee report.

**Query Parameters:**
- `include_history?: boolean`

**Response:** `200 OK`
```typescript
{
  student: Student;
  current_balance: number;
  total_paid: number;
  invoices: Invoice[];
  payment_history: Payment[];
}
```

**Permissions:** 
- SUPER_ADMIN
- SCHOOL_ADMIN (own school)
- PARENT (own children)

---

### GET `/reports/download`
Export reports in CSV or PDF format.

**Query Parameters:**
- `format: "csv" | "pdf"`
- `type: "financial" | "students" | "payments"`
- `start_date?: string`
- `end_date?: string`

**Response:** 
- `200 OK` (file download)

**Permissions:** SCHOOL_ADMIN

---

## Integrations

### GET `/integrations/channels`
Get available payment channels for school.

**Response:** `200 OK`
```typescript
{
  data: PaymentChannelConfig[];
}
```

**Permissions:** SCHOOL_ADMIN

---

### POST `/integrations/channels`
Add new payment channel configuration.

**Request Body:**
```typescript
{
  channel: "MTN" | "Airtel" | "Bank" | "Card";
  provider: string;
  api_key: string;
  merchant_code?: string;
  merchant_name?: string;
  callback_url?: string;
  success_url?: string;
  failure_url?: string;
  test_mode?: boolean;
  config_data?: JSON;
}
```

**Response:** `201 Created`
```typescript
{
  ...PaymentChannelConfig;
}
```

**Permissions:** SCHOOL_ADMIN

---

### PATCH `/integrations/channels/:id`
Update payment channel configuration.

**Request Body:** (all fields optional)
```typescript
{
  api_key?: string;
  merchant_code?: string;
  merchant_name?: string;
  callback_url?: string;
  success_url?: string;
  failure_url?: string;
  is_active?: boolean;
  test_mode?: boolean;
  config_data?: JSON;
}
```

**Response:** `200 OK`
```typescript
{
  ...PaymentChannelConfig;
}
```

**Permissions:** SCHOOL_ADMIN

---

### DELETE `/integrations/channels/:id`
Remove cathedral/ideintegration.

**Response:** `200 OK`
```typescript
{
  message: "Payment channel removed";
}
```

**Permissions:** SCHOOL_ADMIN

---

### POST `/integrations/webhooks`
Register callback URL for payment gateway.

**Request Body:**
```typescript
{
  channel: string;
  webhook_url: string;
  secret?: string;
}
```

**Response:** `201 Created`
```typescript
{
  webhook_id: string;
  url: string;
  status: "active";
}
```

**Permissions:** SCHOOL_ADMIN

---

## Admin & Super Admin

### GET `/admin/overview`
System summary for all schools (Super Admin dashboard).

**Response:** `200 OK`
```typescript
{
  total_schools: number;
  active_schools: number;
  total_students: number;
  total_users: number;
  total_revenue: number;
  recent_activity: AuditLog[];
}
```

**Permissions:** SUPER_ADMIN

---

### GET `/admin/usage`
Resource usage per tenant.

**Query Parameters:**
- `school_id?: string`

**Response:** `200 OK`
```typescript
{
  data: Array<{
    school: School;
    student_count: number;
    user_count: number;
    invoice_count: number;
    payment_count: number;
    storage_used: number;
    last_activity: string;
  }>;
}
```

**Permissions:** SUPER_ADMIN

---

### GET `/admin/logs`
Audit logs.

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `school_id?: string`
- `user_id?: string`
- `entity?: string`
- `action?: string`
- `start_date?: string`
- `end_date?: string`

**Response:** `200 OK`
```typescript
{
  data: AuditLog[];
  meta: PaginationMeta;
}
```

**Permissions:** SUPER_ADMIN

---

### GET `/admin/errors`
Error tracking list.

**Query Parameters:**
- `page?: number`
- `limit?: number`
- `severity?: "low" | "medium" | "high"`
- `resolved?: boolean`

**Response:** `200 OK`
```typescript
{
  data: ErrorLog[];
  meta: PaginationMeta;
}
```

**Permissions:** SUPER_ADMIN

---

## Response Codes

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## Common Query Parameters

### Pagination
- `page?: number` - Page number (default: 1)
- `limit?: number` - Items per page (default: 20, max: 100)

### Filtering
- `search?: string` - Search query
- `sort?: string` - Sort field (e.g., "created_at")
- `order?: "asc" | "desc"` - Sort order (default: "desc")

### Date Ranges
- `start_date?: string` - ISO date string
- `end_date?: string` - ISO date string

