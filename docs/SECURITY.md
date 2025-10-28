# Security Guidelines - SchoolPay+

Comprehensive security documentation for the SchoolPay+ multi-tenant payment platform.

## Table of Contents
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Data Encryption](#data-encryption)
- [API Security](#api-security)
- [Payment Security](#payment-security)
- [Input Validation](#input-validation)
- [Audit Logging](#audit-logging)
- [Best Practices](#best-practices)

---

## Authentication

### JWT Token Strategy

**Access Token:**
- Lifetime: 15 minutes
- Stored: Memory only (client-side)
- Purpose: Authenticate API requests

**Refresh Token:**
- Lifetime: 7 days
- Stored: Database (hashed)
- Purpose: Obtain new access tokens
- Rotation: New refresh token on each use

### Password Requirements
```typescript
{
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
}
```

### Password Hashing
- Algorithm: bcrypt
- Cost Factor: 10 rounds
- Salt: Auto-generated

### Session Management
```typescript
// Secure cookie settings
{
  httpOnly: true,
  secure: true,        // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
```

### 2FA (Two-Factor Authentication)
- TOTP (Time-based One-Time Password)
- Backup codes provided
- Required for: SCHOOL_ADMIN and SUPER_ADMIN

---

## Authorization

### Role-Based Access Control (RBAC)

**Permission Matrix:**

| Action | SUPER_ADMIN | SCHOOL_ADMIN | PARENT | STUDENT |
|--------|-------------|--------------|--------|---------|
| View all schools | ✅ | ❌ | ❌ | ❌ |
| Manage own school | ✅ | ✅ | ❌ | ❌ |
| View own children | ✅ | ✅ | ✅ | ❌ |
| View own data | ✅ | ✅ | ✅ | ✅ |
| Make payments | ✅ | ✅ | ✅ | ❌ |
| Create invoices | ✅ | ✅ | ❌ | ❌ |
| Manage students | ✅ | ✅ | ❌ | ❌ |

### Tenant Isolation
- All queries MUST filter by `school_id`
- Middleware validates tenant access
- SUPER_ADMIN can access any tenant
- Others can only access their own school

### Resource Ownership
```typescript
// Example: Check if user owns resource
async validateOwnership(user: User, resourceId: string): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN') return true;
  
  const resource = await this.repo.findOne(resourceId);
  return resource.school_id === user.school_id;
}
```

---

## Data Encryption

### At Rest Encryption

**Database:**
- Enable PostgreSQL TDE (Transparent Data Encryption)
- Encrypt sensitive columns: api_key, merchant_code

**API Keys:**
```typescript
// Encrypt before storing
const encrypted = encrypt(apiKey, process.env.ENCRYPTION_KEY);

// Decrypt when needed
const decrypted = decrypt(encrypted, process.env.ENCRYPTION_KEY);
```

### In Transit Encryption
- HTTPS only (TLS 1.3)
- Enforce HSTS (HTTP Strict Transport Security)
- Certificate pinning for mobile apps

### Encryption Keys
- Never commit to version control
- Store in environment variables
- Rotate keys periodically
- Use separate keys per environment

---

## API Security

### Rate Limiting
```typescript
// Per IP
rateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100                     // 100 requests
});

// Per User
rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: (req) => req.user.id
});
```

### CORS Configuration
```typescript
{
  origin: process.env.ALLOWED_ORIGINS.split(','),
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}
```

### Request Validation
- Validate all input with class-validator
- Sanitize user input
- Type checking on all DTOs

### SQL Injection Prevention
- Use Prisma parameterized queries
- Never concatenate user input into SQL
- Use Prisma's query builder

---

## Payment Security

### Payment Gateway Integration
- Verify webhook signatures
- Use HTTPS for all gateway communications
- Store transaction references securely

### Webhook Security
```typescript
// Verify webhook signature
function verifyWebhook(payload: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  const expected = hmac('sha256', secret, payload);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### PCI DSS Compliance
- Never store full card details
- Tokenize all payment data
- Use certified payment processors
- Regular security audits

### Payment Validation
```typescript
// Verify payment amount
if (payment.amount <= 0) {
  throw new BadRequestException('Invalid payment amount');
}

// Prevent duplicate payments
const existing = await this.repo.findOne({ transaction_ref });
if (existing) {
  throw new ConflictException('Duplicate transaction');
}
```

---

## Input Validation

### DTO Validation
```typescript
export class CreateStudentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  first_name: string;

  @IsEmail()
  email: string;

  @IsEnum(['M', 'F', 'Other'])
  gender: string;

  @IsUUID()
  school_id: string;
}
```

### Sanitization
```typescript
// Remove dangerous characters
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script>/gi, '')
    .replace(/javascript:/gi, '');
}
```

---

## Audit Logging

### Logged Events
- Authentication (login, logout, failed attempts)
- User management (create, update, delete)
- Payment operations (initiate, confirm, refund)
- Data modifications (invoices, fees, students)
- Permission changes

### Audit Log Structure
```typescript
{
  user_id: string,
  action: string,
  entity: string,
  entity_id: string,
  old_value: object,
  new_value: object,
  ip_address: string,
  user_agent: string,
  timestamp: Date
}
```

### Log Retention
- Keep logs for 2 years minimum
- Archive older logs to cold storage
- Encrypt audit logs at rest

---

## Best Practices

### Code Security
1. **Never log sensitive data**
   ```typescript
   // BAD
   console.log('Payment:', payment);
   
   // GOOD
   console.log('Payment ID:', payment.id);
   ```

2. **Use environment variables**
   ```typescript
   // BAD
   const apiKey = 'abc123';
   
   // GOOD
   const apiKey = process.env.PAYMENT_API_KEY;
   ```

3. **Validate before processing**
   ```typescript
   async processPayment(dto: PaymentDto) {
     await this.validateDto(dto);  // DTO validation
     await this.checkPermissions(); // Authorization
     await this.verifyAmount();     // Business logic
   }
   ```

4. **Handle errors securely**
   ```typescript
   // Don't expose internal errors
   catch (error) {
     logger.error(error);  // Log internally
     throw new InternalServerErrorException('Operation failed');
   }
   ```

### Dependency Security
- Keep dependencies updated
- Use `npm audit` regularly
- Review dependency vulnerabilities
- Use lock files for reproducible builds

### Configuration Security
```typescript
// .env example
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_KEY=...
WEBHOOK_SECRET=...

// Never commit .env
// Use different keys per environment
// Rotate keys periodically
```

### Monitoring
- Monitor failed login attempts
- Track API usage patterns
- Alert on suspicious activity
- Review audit logs regularly

### Incident Response
1. Identify breach
2. Isolate affected systems
3. Assess damage
4. Notify affected users
5. Fix vulnerability
6. Document incident

---

## Security Checklist

### Before Deploying
- [ ] All passwords hashed with bcrypt
- [ ] JWT tokens configured correctly
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] HTTPS enforced
- [ ] Environment variables set
- [ ] Database backups configured
- [ ] Logging enabled
- [ ] Error handling secure

### Regular Maintenance
- [ ] Review audit logs weekly
- [ ] Update dependencies monthly
- [ ] Security audit quarterly
- [ ] Key rotation quarterly
- [ ] Penetration testing annually

---

## Compliance

### GDPR Compliance
- User data export functionality
- Right to be forgotten (data deletion)
- Data minimization
- Consent management

### Financial Regulations
- Keep payment records for 7 years
- Complete audit trail
- Secure payment processing
- Regular compliance reviews

---

## Security Contacts

- Security Team: security@schoolpay.com
- Incident Response: 24/7 security hotline
- Bug Bounty Program: bugs@schoolpay.com

