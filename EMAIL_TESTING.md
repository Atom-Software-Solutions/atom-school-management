# Email Testing Guide

## Quick Test Methods

### Method 1: Test via Postman / Thunder Client

1. **First, get a JWT token by logging in:**
   ```
   POST http://localhost:4000/auth/login
   {
     "email": "your-admin-email@gmail.com",
     "password": "your-password"
   }
   ```

2. **Copy the `accessToken` from the response**

3. **Send a test email:**
   ```
   POST http://localhost:4000/email/send
   Headers:
     Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
     Content-Type: application/json
   
   Body:
   {
     "to": "test-email@gmail.com",
     "subject": "Test Email from SchoolPay+",
     "html": "<h1>Hello!</h1><p>This is a test email from SchoolPay+</p>",
     "text": "Hello! This is a test email from SchoolPay+"
   }
   ```

### Method 2: Test with cURL

```bash
# Step 1: Login and save token
TOKEN=$(curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com","password":"your-password"}' \
  | jq -r '.accessToken')

# Step 2: Send test email
curl -X POST http://localhost:4000/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "to": "test-email@gmail.com",
    "subject": "Test Email from SchoolPay+",
    "html": "<h1>Hello!</h1><p>This is a test email from SchoolPay+</p>"
  }'
```

### Method 3: Use the Pre-built Email Methods

You can trigger emails using the pre-built methods in your application code. These are already set up in `EmailService`:

#### Send Welcome Email
```typescript
// In any service where you import EmailService
await this.emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'SCHOOL_ADMIN'
);
```

#### Send Password Reset Email
```typescript
await this.emailService.sendPasswordResetEmail(
  'user@example.com',
  'John Doe',
  'reset-token-here'
);
```

#### Send Payment Notification
```typescript
await this.emailService.sendPaymentNotification(
  'parent@example.com',
  'Jane Doe',
  'UGX 500,000',
  'Term 1 Tuition Fee'
);
```

## Troubleshooting

### If you get "Email server connection failed"
1. Check your `.env` file has all email settings
2. Verify your Gmail app password is correct (no spaces)
3. Make sure 2FA is enabled on your Google account

### If emails are not being sent
1. Check the server logs for error messages
2. Verify the recipient email address
3. Check your spam folder

### If you get "Insufficient permissions"
Make sure you're logged in as a SUPER_ADMIN or SCHOOL_ADMIN user.

## Testing Email Connection at Startup

When you start the server, check the console logs. You should see:
```
[Nest] Email server connection verified
```

If you see an error, your email configuration is incorrect.

## Recommended Test Flow

1. **Start the server**: `npm run start:dev`
2. **Check startup logs** for email connection status
3. **Login as admin** to get a JWT token
4. **Send a test email** using one of the methods above
5. **Check recipient inbox** (and spam folder)
6. **Verify email appearance** and formatting

## Next Steps

Once testing is complete, you can:
- Integrate welcome emails in user registration
- Add password reset email functionality
- Set up payment notifications
- Customize email templates for your brand
