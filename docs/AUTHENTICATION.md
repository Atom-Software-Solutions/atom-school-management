# Authentication Endpoints

This document describes the authentication endpoints implemented for the Atom School Management system.

## Overview

The authentication system uses JWT (JSON Web Tokens) for secure user authentication. Passwords are hashed using bcrypt before storage in the database.

## Endpoints

### 1. Register User

**POST** `/auth/register`

Register a new user in the system.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT",
  "phone": "+1234567890",
  "schoolId": "uuid-string" // optional
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "phone": "+1234567890",
    "schoolId": "uuid-string"
  }
}
```

**Available Roles:**
- `SUPER_ADMIN`
- `SCHOOL_ADMIN`
- `PARENT`
- `STUDENT此`

### 2. Login

**POST** `/auth/login`

Authenticate a user and receive a JWT access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "phone": "+1234567890",
    "schoolId": "uuid-string"
  }
}
```

### 3. Verify Email Address

**GET** `/api/auth/verify-email?token=<token>`

Verify a user's email address using the verification token that was sent via email. The endpoint is idempotent: clicking the same link multiple times will always return a 200 response with an appropriate message.

**Query Parameters:**

- `token` (string, required): The verification token from the email.

**Responses (200 OK):**

```json
{
  "message": "Email verified successfully"
}
```
or

```json
{
  "message": "Email already verified"
}
```
or

```json
{
  "message": "Email already verified or verification link is invalid/expired"
}
```

---

### 4. Get Profile

**GET** `/api/auth/profile`

Get the current authenticated user's profile. Requires authentication.

**Headers:**
```
Authorization: Bearer <accessToken>
```

> Timestamps (e.g. `createdAt`, `updatedAt`, `lastLogin`) are returned as ISO 8601 strings in UTC (e.g. `2026-01-18T12:34:56.000Z`).
If your school operates in a specific time zone (e.g. `Africa/Kampala` which is GMT+3), your frontend should convert these UTC timestamps to the school’s configured `timeZone` (see `School.time_zone`) before displaying them.

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT",
  "phone": "+1234567890",
  "schoolId": "uuid-string",
  "createdAt": "2026-01-18T12:34:56.000Z",
  "updatedAt": "2026-01-18T12:34:56.000Z",
  "lastLogin": "2026-01-18T12:34:56.000Z"
}
```

## Usage Examples

### Using cURL

#### Register:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "STUDENT"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'
```

#### Get Profile:
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with a salt rounds of 10
2. **JWT Tokens**: Access tokens are signed with a secret key and expire after 7 days
3. **Input Validation**: All inputs are validated using class-validator decorators
4. **Active User Check**: Only active users can log in
5. **Last Login Tracking**: System tracks the last login time for each user

## Environment Variables

Make sure to set the following environment variable:

- `JWT_SECRET`: Secret key for signing JWT tokens (required in production)
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (defaults to 3000 if not set)

## Error Handling

The authentication endpoints return appropriate HTTP status codes:

- `200`: Success (login, profile)
- `201`: Created (register)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid credentials, inactive account)
- `409`: Conflict (email already exists)
- `500`: Internal Server Error

## Protecting Routes

To protect other routes with authentication, use the `JwtAuthGuard`:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('protected-route')
getProtectedData() {
  // This route is now protected
  return { data: 'This is protected data' };
}
```

The authenticated user object will be available in `req.user` within the controller method.

