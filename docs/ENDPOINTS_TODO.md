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
- [ ] `POST /auth/refresh` - Refresh access token using refresh token
- [ ] `POST /auth/forgot-password` - Request password reset
- [ ] `POST /auth/reset-password` - Reset password with token
- [x] `GET /auth/profile` - Get current user profile (maps to GET /auth/me)

---

## School Management

- [x] `GET /schools` - List all schools (Super Admin only)
- [x] `POST /schools` - Create new school (Super Admin only)
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
- [ ] `POST /users/:id/reset-password` - Reset user password (admin action)

---

## Student Management

- [ ] `GET /students` - List students (tenant-scoped)
- [ ] `POST /students` - Add new student
- [ ] `GET /students/:id` - View student profile
- [ ] `PATCH /students/:id` - Update student information
- [ ] `DELETE /students/:id` - Archive student (soft delete)
- [ ] `GET /students/:id/invoices` - Get student invoices
- [ ] `GET /students/:id/payments` - Get student payment history
- [ ] `POST /students/:id/guardians` - Add guardian to student

---

## Fee & Billing

- [ ] `GET /fees/categories` - List fee categories
- [ ] `POST /fees/categories` - Create fee category
- [ ] `GET /fees/structures` - List fee structures
- [ ] `POST /fees/structures` - Create fee structure
- [ ] `GET /invoices` - List invoices
- [ ] `POST /invoices` - Create invoice
- [ ] `GET /invoices/:id` - View invoice details
- [ ] `PATCH /invoices/:id` - Update invoice
- [ ] `POST /invoices/:id/cancel` - Cancel invoice

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

---

## Notifications

- [ ] `GET /notifications` - List notifications for current user
- [ ] `POST /notifications/send` - Send notification (SMS, Email, or InApp)
- [ ] `GET /notifications/:id` - View notification details
- [ ] `PATCH /notifications/:id/read` - Mark notification as read

---

## Reporting & Analytics

- [ ] `GET /reports/financial` - Get financial summary
- [ ] `GET /reports/school/:id` - Get school-specific analytics (Super Admin)
- [ ] `GET /reports/student/:id` - Get student-level fee report
- [ ] `GET /reports/download` - Export reports in CSV or PDF format

---

## Integrations

- [ ] `GET /integrations/channels` - Get available payment channels for school
- [ ] `POST /integrations/channels` - Add new payment channel configuration
- [ ] `PATCH /integrations/channels/:id` - Update payment channel configuration
- [ ] `DELETE /integrations/channels/:id` - Remove payment channel integration
- [ ] `POST /integrations/webhooks` - Register callback URL for payment gateway

---

## Admin & Super Admin

- [ ] `GET /admin/overview` - System summary for all schools (Super Admin dashboard)
- [ ] `GET /admin/usage` - Resource usage per tenant
- [ ] `GET /admin/logs` - Audit logs
- [ ] `GET /admin/errors` - Error tracking list

---

## Summary

- **Total Endpoints**: 51
- **Implemented**: 15
- **In Progress**: 0
- **Not Implemented**: 36
- **Completion**: 29.4%

---

## Notes

- This checklist should be updated as endpoints are implemented
- Mark completed endpoints with ✅
- Mark in-progress endpoints with ⏳
- Leave unmarked for not implemented
