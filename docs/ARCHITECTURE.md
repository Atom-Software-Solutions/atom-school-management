# Architecture & Design - SchoolPay+

High-level architecture and design decisions for the SchoolPay+ multi-tenant payment platform.

## Table of Contents
- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Multi-Tenancy](#multi-tenancy)
- [Security Architecture](#security-architecture)
- [API Design](#api-design)
- [Database Design](#database-design)
- [Payment Integration](#payment-integration)
- [Deployment Architecture](#deployment-architecture)

---

## System Overview

SchoolPay+ is a multi-tenant SaaS platform that enables schools to manage student billing and receive digital payments. The system serves multiple schools (tenants) with isolated data.

### Core Features
1. **Multi-tenant Architecture** - Each school operates in isolation with shared infrastructure
2. **Role-Based Access Control** - Four user roles with different permission levels
3. **Student & Guardian Management** - Manage student profiles and link guardians
4. **Fee Structure & Billing** - Configure fees per class/term and issue invoices
5. **Payment Processing** - Integrate with MTN, Airtel, banks, and card providers
6. **Notifications** - SMS, email, and in-app notifications
7. **Reporting & Analytics** - Financial reports and student payment history
8. **Audit Trail** - Complete audit logging for compliance

---

## Technology Stack

### Backend
- **Framework:** NestJS (Node.js, TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT (access + refresh tokens)
- **Password Hashing:** bcrypt
- **Validation:** class-validator, class-transformer

### Payment Gateways
- **Mobile Money:** MTN, Airtel
- **Banking:** Bank APIs
- **Cards:** Stripe or similar

### Notification Services
- **SMS:** African SMS provider
- **Email:** SMTP or email service (SendGrid, AWS SES)

### Infrastructure
- **Hosting:** Cloud provider (AWS, Vercel, Railway)
- **CI/CD:** GitHub Actions
- **Monitoring:** Error tracking (Sentry)
- **Documentation:** Swagger/OpenAPI

---

## Architecture Patterns

### Layered Architecture
```
Controllers → Services → Repository → Database
```

### Modular Structure
Each domain has:
- Module definition
- Controller (endpoints)
- Service (business logic)
- DTOs (Data Transfer Objects)
- Entities (database models)
- Guards (authorization)

---

## Multi-Tenancy

### Strategy: Shared Database with Tenant Isolation
- One PostgreSQL database with schemas
- Data scoped by `school_id`
- Middleware enforces tenant boundaries

### Tenant Isolation Middleware
```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    req.tenantId = user.role === 'SUPER_ADMIN' ? null : user.school_id;
    next();
  }
}
```

---

## Security Architecture

### Authentication Flow
1. User login → Verify credentials
2. Generate JWT (access + refresh)
3. Immigration─refreshtoken in database
4. Return tokens to client

### JWT Structure
**Access Token (15 minutes):**
```json
{
  "sub": "user.id",
  "email": "user.email",
  "role": "user.role",
  "school_id": "user.school_id",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Authorization Levels
- **SUPER_ADMIN:** Full access to all tenants
- **SCHOOL_ADMIN:** Own school only
- **PARENT:** Own children only
- **STUDENT:** Read-only own data

---

## API Design

### Request/Response Format
```typescript
// Success
{
  data: T | T[],
  meta?: {
    page: number;
    limit: number;
    total: number;
  }
}

// Error
{
  statusCode: number,
  message: string,
  errors?: Array<{ field: string; message: string[] }>
}
```

---

## Database Design

### Schema Organization
```
PostgreSQL Database
├── user_mgt schema (School, User, Role)
└── payment_mgt schema (Payment, Transaction)
```

### Indexing Strategy
- Primary indexes on foreign keys
- Composite indexes for common queries
- Full-text search on student names

---

## Payment Integration

### Payment Flow
```
1. Initiate payment → 2. Gateway API call → 3. Webhook callback
4. Verify signature → 5. Update status → 6. Generate receipt
```

### Gateway Abstraction
```typescript
interface PaymentGateway {
  initiatePayment(params): Promise<Response>;
  verifyPayment(ref: string): Promise<Status>;
  handleWebhook(payload): Promise<Update>;
}
```

---

## Deployment Architecture

```
Load Balancer → NestJS App (Multiple instances) → PostgreSQL (Primary + Replica)
```

---

## Development Workflow

1. `npm install`
2. Copy `.env.example` to `.env`
3. `npx prisma migrate dev`
4. `npm run start:dev`

---

## Future Considerations

- GraphQL API
- Multi-currency support
- Mobile apps
- Advanced analytics

