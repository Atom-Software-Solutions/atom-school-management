# Debugging 401 Error on /auth/profile

## Common Causes and Solutions

### 1. **Missing "Bearer" Prefix**
The token must include the "Bearer " prefix in the Authorization header.

❌ **Wrong:**
```bash
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **Correct:**
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example using cURL:**
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. **Mismatched JWT Secret**
If you generated the token with one secret but the server is using another, tokens won't validate.

**Check your environment:**
```bash
# Make sure JWT_SECRET is set or using the default
echo $JWT_SECRET
```

**To test your token:**
```bash
node test-jwt.js
```

### 3. **User Not Found or Inactive**
The JWT strategy validates that:
- The user exists in the database
- The user's `is_active` status is `true`

Check your database:
```sql
SELECT id, email, is_active FROM "user_mgt"."User" WHERE email = 'your-email@example.com';
```

### 4. **Token Expired**
Tokens expire after 7 days by default. If your token is older, create a new one by logging in again.

### 5. **Server Not Running**
Make sure your NestJS server is running:
```bash
npm run start:dev
```

## Step-by-Step Debug Process

### Step 1: Get a Fresh Token
```bash
# First, register or login to get a token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Step 2: Copy the Token
Copy the `accessToken` from the response.

### Step 3: Test the Profile Endpoint
```bash
# Replace YOUR_TOKEN_HERE with the actual token
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -v
```

The `-v` flag will show you detailed request/response headers.

### Step 4: Check Server Logs
Look at your server console for any error messages that might indicate what went wrong.

## If All Else Fails

### Enable Detailed Logging
Add this to `src/auth/strategies/jwt.strategy.ts`:

```typescript
async validate(payload: JwtPayload) {
  console.log('JWT Payload:', payload);
  
  const user = await this.usersService.findByEmail(payload.email);
  console.log('User found:', user ? user.email : 'NOT FOUND');
  
  if (!user || !user.is_active) {
    throw new UnauthorizedException('User not found or inactive');
  }

  return user;
}
```

Then check the server logs when you make the request.

## Testing with Postman or Thunder Client

1. Set method to `GET`
2. URL: `http://localhost:3000/auth/profile`
3. Go to "Headers" tab
4. Add header:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`
5. Send the request

## Quick Test Script

Create a test script to verify everything works:

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# Use token
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

