# Schema Quick Reference - SchoolPay+

Quick visual reference for database schema organization.

## Schema Distribution

```
PostgreSQL Database
│
├── user_mgt (User & Tenant Management)
│   ├── Role (enum)
│   ├── School
│   ├── SchoolSettings
│   ├── User
│   ├── Notification
│   └── AuditLog
│
├── student_mgt (Student Management)
│   ├── Student
│   └── GuardianStudent (junction)
│
├── fee_mgt (Fee & Billing)
│   ├── FeeCategory
│   ├── FeeStructure
│   └── Invoice
│
└── payment_mgt (Payments & Receipts)
    ├── PaymentChannel (enum)
    ├── PaymentStatus (enum)
    ├── Payment
    ├── PaymentChannelConfig
    └── Receipt
```

## Model Count by Schema

| Schema | Models | Purpose |
|--------|--------|---------|
| **user_mgt** | 6 | Authentication, tenant management, logging |
| **student_mgt** | 2 | Student data and guardian relationships |
| **fee_mgt** | 3 | Fee configuration and invoicing |
| **payment_mgt** | 5 | Payment processing and receipts |
| **Total** | **16** | Complete multi-tenant system |

## Cross-Schema Relationships

```
School (user_mgt)
    ├──→ Students (student_mgt) via school_id
    ├──→ Users (user_mgt) via school_id
    ├──→ Fees (fee_mgt) via school_id
    └──→ Payments (payment_mgt) via school_id

Student (student_mgt)
    ├──→ Guardian (user_mgt.User) via guardian_id
    └──→ Invoices (fee_mgt) via student_id

Invoice (fee_mgt)
    └──→ Payment (payment_mgt) via invoice_id

Payment (payment_mgt)
    ├──→ Student (student_mgt) via student_id
    └──→ Receipt (payment_mgt) via payment_id
```

## Implementation Checklist

- [ ] Update Prisma datasource to include all 4 schemas
- [ ] Add all models with `@@schema("schema_name")` directive
- [ ] Use scalar fields for cross-schema foreign keys
- [ ] Create indexes on all foreign key fields
- [ ] Add cascade rules where appropriate
- [ ] Test migrations on development database
- [ ] Verify cross-schema queries work correctly

## Key Points

1. **Use scalar fields** for foreign keys across schemas (Prisma limitation)
2-only **Queries with joins** across schemas may be slower
3. **Index all foreign keys** for better performance
4. **Schema naming** follows `*_mgt` convention
5. **Start with user_mgt** schema as foundation

