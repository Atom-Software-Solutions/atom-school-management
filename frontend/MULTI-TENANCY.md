# Multi-Tenancy Implementation Guide

This document explains how multi-tenancy is implemented in the School Management System frontend.

## 🏫 Overview

The system supports **multiple schools (tenants)** with a flexible architecture that works in different deployment scenarios:

1. **Subdomain-based Access** - Each school has its own subdomain
2. **School Selection** - Users select from multiple schools after login
3. **Hybrid Approach** - Combination of both methods

## 🎯 How It Works

### Tenant Identification

The system identifies which school the user is accessing through:

1. **Subdomain** (Priority 1)
   - URL: `atom-high.yourapp.com`
   - Extracted domain: `atom-high`
   - Sent in header: `X-School-Domain: atom-high`

2. **Selected School** (Priority 2)
   - User selects school after login
   - Stored in localStorage
   - Sent in header: `X-School-Id: <school-id>` or `X-School-Domain: <domain>`

3. **No Selection** (Fallback)
   - User presented with school selector
   - Must choose before accessing dashboard

### Request Headers

All API requests automatically include tenant identification:

```javascript
// If subdomain detected
headers: {
  'X-School-Domain': 'atom-high'
}

// If school selected
headers: {
  'X-School-Id': 'uuid-here'
  // or
  'X-School-Domain': 'atom-high'
}
```

## 🔧 Backend Integration

### Required Backend Changes

Your NestJS backend should handle these headers:

#### 1. Create Tenant Interceptor

```typescript
// src/common/interceptors/tenant.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Extract tenant info from headers
    const schoolDomain = request.headers['x-school-domain'];
    const schoolId = request.headers['x-school-id'];
    
    if (schoolDomain) {
      // Resolve school by domain
      // Add to request for use in controllers/services
      request.schoolDomain = schoolDomain;
    } else if (schoolId) {
      // Use school ID directly
      request.schoolId = schoolId;
    }
    
    return next.handle();
  }
}
```

#### 2. Apply Globally

```typescript
// src/main.ts
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply tenant interceptor globally
  app.useGlobalInterceptors(new TenantInterceptor());
  
  // Enable CORS for subdomains
  app.enableCors({
    origin: [
      'http://localhost:5173',
      /^https?:\/\/[\w-]+\.yourapp\.com$/,  // All subdomains
    ],
    credentials: true,
  });
  
  await app.listen(3000);
}
```

#### 3. Use in Services

```typescript
// Example: students.service.ts
async findAll(schoolId: string) {
  return this.prisma.student.findMany({
    where: { schoolId },
  });
}

// In controller
@Get()
async findAll(@Request() req) {
  const schoolId = req.schoolId || 
    (await this.getSchoolIdFromDomain(req.schoolDomain));
  return this.studentsService.findAll(schoolId);
}
```

#### 4. Update Auth Profile

Return schools array in profile endpoint:

```typescript
// auth.controller.ts
@Get('profile')
async getProfile(@Request() req) {
  const user = await this.usersService.findOne(req.user.id);
  
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    schools: user.schoolMemberships.map(m => ({
      id: m.school.id,
      name: m.school.name,
      domain: m.school.domain,
      address: m.school.address,
      role: m.role,
    })),
  };
}
```

## 🚀 Deployment Scenarios

### Scenario 1: Single Domain with School Selection

**URL**: `yourapp.com`

**Setup**:
- Users log in at `yourapp.com/login`
- After login, choose from available schools
- Selected school stored in localStorage
- All requests include `X-School-Id` header

**DNS Setup**: Simple - just point your domain

**Best For**: Development, small deployments

### Scenario 2: Subdomain per School

**URLs**:
- `atom-high.yourapp.com`
- `green-valley.yourapp.com`
- `st-marys.yourapp.com`

**Setup**:
- Each school has dedicated subdomain
- Users log in at their school's subdomain
- Subdomain determines tenant automatically
- All requests include `X-School-Domain` header

**DNS Setup**: Wildcard DNS record
```
*.yourapp.com -> Your Server IP
```

**Best For**: Production, better isolation, branded experience

### Scenario 3: Hybrid (Recommended)

**Combination of both**:
- Subdomains for schools that want branded URLs
- School selection for users who work at multiple schools
- Falls back gracefully

**Best For**: Flexibility, supporting all use cases

## 📝 User Flows

### Flow 1: Subdomain Access

```
1. User visits atom-high.yourapp.com/login
2. System detects subdomain "atom-high"
3. User logs in
4. Redirected to dashboard
5. All API calls include X-School-Domain: atom-high
```

### Flow 2: School Selection

```
1. User visits yourapp.com/login
2. User logs in
3. System checks user's schools
   - If 1 school: Auto-select and go to dashboard
   - If multiple: Show school selector
4. User selects school
5. School stored in localStorage
6. Redirected to dashboard
7. All API calls include X-School-Id or X-School-Domain
```

### Flow 3: Multi-School User

```
1. Teacher works at multiple schools
2. Logs in and selects "Atom High School"
3. Works with Atom High data
4. Logs out (or switches school)
5. Selects "Green Valley School"
6. Now sees Green Valley data
```

## 🔐 Security Considerations

### 1. Backend Validation

Always validate tenant access on the backend:

```typescript
// WRONG - Never trust client headers alone
async getData(@Headers('x-school-id') schoolId: string) {
  return this.service.getData(schoolId);
}

// RIGHT - Validate user has access
async getData(@Headers('x-school-id') schoolId: string, @Request() req) {
  const user = req.user;
  
  // Check if user has access to this school
  if (!user.schools.some(s => s.id === schoolId)) {
    throw new ForbiddenException('No access to this school');
  }
  
  return this.service.getData(schoolId);
}
```

### 2. Row-Level Security

Use Prisma middleware or database RLS:

```typescript
// Prisma middleware example
prisma.$use(async (params, next) => {
  if (params.model === 'Student') {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        schoolId: getCurrentSchoolId(),
      };
    }
  }
  return next(params);
});
```

### 3. JWT Claims

Include school IDs in JWT token:

```typescript
const payload = {
  sub: user.id,
  email: user.email,
  schools: user.schools.map(s => s.id),
};
```

## 🧪 Testing Multi-Tenancy

### Test Subdomain Locally

Add to your `hosts` file:

**Windows**: `C:\Windows\System32\drivers\etc\hosts`
**Mac/Linux**: `/etc/hosts`

```
127.0.0.1 atom-high.localhost
127.0.0.1 green-valley.localhost
```

Then access:
- `http://atom-high.localhost:5173`
- `http://green-valley.localhost:5173`

### Test School Selection

1. Create test user with multiple schools in database
2. Login at `localhost:5173`
3. Should see school selector
4. Select a school
5. Verify correct data loads

## 🛠️ Frontend API

### Tenancy Utilities

```javascript
import {
  getSchoolDomainFromUrl,
  getCurrentSchoolId,
  setCurrentSchoolId,
  getCurrentSchoolDomain,
  setCurrentSchoolDomain,
  clearSchoolData,
  getTenantIdentifier,
  isSubdomainMode,
} from './utils/tenancy';

// Check current mode
if (isSubdomainMode()) {
  console.log('Using subdomain:', getSchoolDomainFromUrl());
} else {
  console.log('Using school ID:', getCurrentSchoolId());
}

// Get tenant info for API call
const tenant = getTenantIdentifier();
// Returns: { type: 'domain', value: 'atom-high' }
// Or: { type: 'id', value: 'uuid' }
// Or: null
```

### Auth Context

```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { needsSchoolSelection } = useAuth();
  
  if (needsSchoolSelection) {
    // User needs to select a school
  }
}
```

## 📊 Database Schema

Your backend should support these relationships:

```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  firstName       String
  lastName        String
  schoolMemberships SchoolMember[]
}

model School {
  id      String   @id @default(uuid())
  name    String
  domain  String   @unique  // e.g., "atom-high"
  members SchoolMember[]
  students Student[]
  // ... other school data
}

model SchoolMember {
  id       String @id @default(uuid())
  userId   String
  schoolId String
  role     String  // 'admin', 'teacher', 'staff'
  
  user     User   @relation(fields: [userId], references: [id])
  school   School @relation(fields: [schoolId], references: [id])
  
  @@unique([userId, schoolId])
}

model Student {
  id       String @id @default(uuid())
  schoolId String
  school   School @relation(fields: [schoolId], references: [id])
  // ... student fields
  
  @@index([schoolId])
}
```

## 🔄 Migration Path

### Phase 1: Development (Current)
- Single domain: `localhost:5173`
- School selection after login
- Test with multiple schools

### Phase 2: Staging
- Configure wildcard subdomain
- Test subdomain access
- Verify school isolation

### Phase 3: Production
- Deploy with subdomain support
- Schools can choose: subdomain or school selector
- Monitor and optimize

## 📚 Additional Resources

- [Tenant Identification Best Practices](https://example.com)
- [Subdomain Routing in Node.js](https://example.com)
- [Multi-Tenant Database Patterns](https://example.com)

## 🆘 Troubleshooting

### Issue: Subdomain not detected locally

**Solution**: Add to hosts file or use services like ngrok

### Issue: CORS errors with subdomains

**Solution**: Update backend CORS to allow wildcard subdomains:
```typescript
origin: /^https?:\/\/[\w-]+\.yourapp\.com$/
```

### Issue: School selection not showing

**Solution**: Check user profile includes `schools` array in API response

### Issue: Data from wrong school

**Solution**: Verify backend is properly filtering by schoolId
