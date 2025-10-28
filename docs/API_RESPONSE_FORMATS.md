# API Response Formats - SchoolPay+

Standard response formats for all API endpoints.

## Table of Contents
- [Success Responses](#success-responses)
- [Error Responses](#error-responses)
- [Pagination](#pagination)
- [Validation Errors](#validation-errors)

---

## Success Responses

### Single Resource
```typescript
// GET /users/:id
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "PARENT",
  "school_id": "uuid",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Collection of Resources
```typescript
// GET /students
{
  "data": [
    {
      "id": "uuid",
      "student_code": "STD001",
      "first_name": "Jane",
      "last_name": "Smith",
      "class_name": "P.5",
      // ... other fields
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": clenchedBesides
  }
}
```

### No Content
```typescript
// DELETE /students/:id
// HTTP 204 No Content
// Response body is empty
```

---

## Error Responses

### 400 Bad Request
```typescript
{
  "statusCode": 400,
  "message": "Invalid request data",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```typescript
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or expired token",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```typescript
{
  "statusCode": 403,
  "message": "Insufficient permissions to access this resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```typescript
{
  "statusCode": 404,
  "message": "Student not found",
  "error": "Not Found"
}
```

### 409 Conflict
```typescript
{
  "statusCode": 409,
  "message": "Student code already exists",
  "error": "Conflict"
}
```

### 422 Unprocessable Entity
```typescript
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": ["email must be a valid email", "email is required"]
    },
    {
      "field": "password",
      "message": ["password must be at least 8 characters"]
    }
  ]
}
```

### 500 Internal Server Error
```typescript
{
  "statusCode": 500,
  "message": "An unexpected error occurred",
  "error": "Internal Server Error"
}
```

---

## Pagination

### Request Parameters
```typescript
GET /students?page=2&limit=50

// Parameters
{
  page: number;      // Page number (default: 1)
  limit: number;     // Items per page (default: 20, max: 100)
  sort?: string;     // Sort field (default: "created_at")
  order?: "asc" | "desc"; // Sort order (default: "desc")
}
```

### Response Format
```typescript
{
  "data": Array<Resource>,
  "meta": {
    "page": 2,
    "limit": 50,
    "total": 156,
    "total_pages": 4,
    "has_next": true,
    "has_prev": true
  }
}
```

---

## Validation Errors

### DTO Validation
```typescript
// POST /students
// Request body with invalid data
{
  "email": "invalid-email",  // Invalid email format
  "password": "123",          // Too short
  "role": "INVALID"          // Invalid enum value
}

// Response
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": ["email must be an email"]
    },
    {
      "field": "password",
      "message": [
        "password must be longer than or equal to 8 characters",
        "password must contain at least one uppercase letter"
      ]
    },
    {
      "field": "role",
      "message": ["role must be one of the following values: PARENT, STUDENT, SCHOOL_ADMIN, SUPER_ADMIN"]
    }
  ]
}
```

---

## Common Response Examples

### Authentication Success
```typescript
// POST /auth/login
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "PARENT",
    "school_id": "uuid",
    "first_name": "John",
    "last_name": "Doe"
  },
  "expires_in": 900  // seconds
}
```

### Payment Initiation
```typescript
// POST /payments/initiate
{
  "payment_id": "uuid",
  "transaction_ref": "TXN123456789",
  "payment_code": "PAY001234",
  "payment_url": "https://gateway.com/pay/TXN123456789",
  "instructions": "Dial *165*1# to complete payment",
  "amount": 500000,
  "channel": "MTN",
  "status": "Pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Payment Confirmation
```typescript
// POST /payments/:id/confirm
{
  "id": "uuid",
  "transaction_ref": "TXN123456789",
  "payment_code": "PAY001234",
  "amount": 500000,
  "channel": "MTN",
  "status": "Success",
  "paid_at": "2024-01-15T10:35:00Z",
  "confirmed_at": "2024-01-15T10:35:30Z",
  "invoice_updated": true,
  "receipt_number": "RCP001234"
}
```

---

## HTTP Status Codes Summary

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PATCH request |
| 201 | Created | Successful POST request |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid request syntax |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation errors |
| 500 | Internal Server Error | Server error |

---

## Best Practices

1. **Consistent Naming**
   - Use camelCase for all JSON properties
   - Use ISO 8601 for dates (e.g., "2024-01-15T10:30:00Z")

2. **Always Include Metadata**
   - Add pagination metadata for collections
   - Include timestamps where relevant

3. **Error Messages**
   - Be descriptive but don't expose internal details
   - Log detailed errors server-side
   - Return user-friendly messages to clients

4. **Empty Responses**
   - Use 204 No Content for successful DELETE
   - Omit response body when appropriate

5. **TypeScript Interfaces**
   ```typescript
   export interface ApiResponse<T> {
     data?: T;
     meta?: PaginationMeta;
   }

   export interface ApiError {
     statusCode: number;
     message: string;
     error: string;
     errors?: ValidationError[];
   }
   ```

