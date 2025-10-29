# Email Configuration Guide

This guide explains how to configure and use the email notification system powered by Nodemailer.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@schoolpay.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

## Gmail Setup

To use Gmail as your email provider:

1. **Enable 2-Factor Authentication** on your Google account
2. Go to [Google Account Settings](https://myaccount.google.com/)
3. Navigate to **Security** → **2-Step Verification**
4. Scroll down to **App Passwords**
5. Generate a new app password for "Mail"
6. Copy the generated password and use it as `EMAIL_PASSWORD`

## Other Email Providers

### SMTP Configuration Examples

**Outlook/Hotmail:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
```

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

**Mailtrap (for testing):**
```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-username
EMAIL_PASSWORD=your-mailtrap-password
```

## Available Methods

### 1. Send Custom Email

```typescript
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Custom Subject',
  html: '<h1>Hello</h1><p>This is a custom email.</p>',
  text: 'Hello\nThis is a custom email.', // Optional plain text version
});
```

### 2. Send Welcome Email

```typescript
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'SCHOOL_ADMIN'
);
```

### 3. Send Password Reset Email

```typescript
await emailService.sendPasswordResetEmail(
  'user@example.com',
  'John Doe',
  'reset-token-here'
);
```

### 4. Send School Creation Notification

```typescript
await emailService.sendSchoolCreatedNotification(
  'admin@example.com',
  'Green Valley School',
  'GVS2024'
);
```

### 5. Send Payment Notification

```typescript
await emailService.sendPaymentNotification(
  'parent@example.com',
  'Jane Doe',
  'UGX 500,000',
  'Term 1 Tuition Fee'
);
```

## API Endpoint

**POST** `/email/send`

Send a custom email (requires authentication and admin role).

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<h1>HTML content</h1>",
  "text": "Plain text content",
  "from": "sender@example.com" // Optional, defaults to EMAIL_FROM
督促

Response:**
```json
{
  "message": "Email sent successfully"
}
```

## Integration Example

To use the email service in other modules:

```typescript
import { EmailService } from './email/email.service';

@Injectable()
export class MyService {
  constructor(private readonly emailService: EmailService) {}

  async createUser(userData: any) {
    // Create user logic...
    
    // Send welcome email
    await this.emailService.sendWelcomeEmail(
      userData.email,
      userData.firstName,
      userData.role
    );
  }
}
```

## Testing

For development and testing, you can use:
- **Mailtrap**: Capture emails without sending them
- **Ethereal Email**: Generate test SMTP credentials instantly

Both services allow you to see how your emails look without actually sending them.

## Troubleshooting

### Connection Errors

1. Verify your email credentials
2. Check if 2FA is enabled (Gmail)
3. Ensure you're using an app-specific password
4. Check firewall settings

### Emails Not Being Delivered

1. Check spam folder
2. Verify recipient email address
3. Ensure EMAIL_FROM is properly configured
4. Check email service logs

### Gmail "Less Secure Apps" Error

Gmail no longer supports "less secure apps". Use an app password instead:
1. Enable 2FA
2. Generate an app password
3. Use it as EMAIL_PASSWORD

## Security Best Practices

1. Never commit `.env` files to version control
2. Use environment variables for all sensitive data
3. Rotate app passwords regularly
4. Monitor email sending logs
5. Implement rate limiting for email endpoints
6. Validate all email inputs
7. Use HTTPS for all email links
8. Sanitize user-provided content before including in emails
