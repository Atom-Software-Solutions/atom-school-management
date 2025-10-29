# Quick Email Test Instructions

## Step 1: Start the Server

Open your terminal and run:
```bash
npm run start:dev
```

Watch for these logs to confirm email is configured:
```
✅ Email server connection verified
```

## Step 2: Get an Access Token

**Option A: Using existing super admin account**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin-email@example.com",
    "password": "your-password"
  }'
```

Copy the `accessToken` from the response.

**Option B: Create a new admin account**
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "test123456",
    "firstName": "Admin",
    "lastName": "User",
    "phone": "1234567890",
    "role": "SUPER_ADMIN"
  }'
```

Then login with the credentials above to get a token.

## Step 3: Send a Test Email

Replace `YOUR_TOKEN_HERE` with the actual token from Step 2:

```bash
curl -X POST http://localhost:4000/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "to": "your-email@gmail.com",
    "subject": "Test from SchoolPay+",
    "html": "<h1>🎉 Success!</h1><p>Your email service is working correctly.</p>",
    "text": "Success! Your email service is working correctly."
  }'
```

## What to Expect

**Success Response:**
```json
{
  "message": "Email sent successfully"
}
```

**Error Response (if not admin):**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

## Alternative: Test with Postman

1. Create a new POST request to `http://localhost:4000/email/send`
2. In **Headers**, add:
   - `Authorization`: `Bearer YOUR_TOKEN_HERE`
   - `Content-Type`: `application/json`
3. In **Body** (raw JSON), paste:
```json
{
  "to": "your-email@gmail.com",
  "subject": "Test from SchoolPay+",
  "html": "<h1>Hello from SchoolPay+!</h1>"
}
```
4. Click Send

## Check Your Email

- Check inbox: `your-email@gmail.com`
- Don't forget to check spam folder!
- Email should arrive within a few seconds

## Need Help?

If you get errors:
1. Check server logs for detailed error messages
2. Verify your `.env` file has correct email credentials
3. Make sure 2FA is enabled on your Gmail account
4. Verify app password is correct (no spaces)
