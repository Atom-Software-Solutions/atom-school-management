import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASSWORD');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isTest = nodeEnv === 'test';

    // In test mode, use a mock transporter if credentials are missing
    if (isTest && (!emailUser || !emailPass)) {
      this.transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 587,
        secure: false,
        // No auth needed for test mode
      });
      this.logger.debug('Email service initialized in test mode (no SMTP connection)');
      return;
    }

    // Production/development mode - require credentials
    if (!emailUser || !emailPass) {
      this.logger.warn('Email credentials not configured. Email functionality will be limited.');
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
        port: this.configService.get<number>('EMAIL_PORT', 587),
        secure: false,
        // No auth - will fail on send, but won't error on init
      });
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('EMAIL_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Verify connection configuration (only in non-test environments)
    if (!isTest) {
      this.verifyConnection();
    }
  }

  /**
   * Verify email connection
   */
  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Email server connection verified');
    } catch (error) {
      // Only log as warning, not error, to avoid cluttering test output
      this.logger.warn('Email server connection verification failed (emails may not work):', error.message || error);
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(sendEmailDto: SendEmailDto): Promise<void> {
    const { to, subject, html, text, from } = sendEmailDto;

    const emailFrom = from || this.configService.get<string>('EMAIL_FROM') || this.configService.get<string>('EMAIL_USER', '');

    try {
      const info = await this.transporter.sendMail({
        from: from || emailFrom,
        to,
        subject,
        html,
        text,
      });

      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    to: string,
    firstName: string,
    role: string,
  ): Promise<void> {
    const subject = 'Welcome to SchoolPay+';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to SchoolPay+, ${firstName}!</h1>
        <p style="color: #666; font-size: 16px;">
          Your account has been successfully created as a <strong>${role}</strong>.
        </p>
        <p style="color: #666; font-size: 16px;">
          You can now log in to start managing your school payments.
        </p>
        <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
          <p style="color: #666;">Welcome aboard!</p>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions, please don't hesitate to contact our support team.
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p style="color: #666; font-size: 16px;">Hello ${firstName},</p>
        <p style="color: #666; font-size: 16px;">
          You requested to reset your password. Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">
          ${resetUrl}
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send school creation notification
   */
  async sendSchoolCreatedNotification(
    to: string,
    schoolName: string,
    schoolCode: string,
  ): Promise<void> {
    const subject = `New School Created: ${schoolName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">School Successfully Created!</h1>
        <p style="color: #666; font-size: 16px;">
          Congratulations! Your school has been successfully registered in SchoolPay+.
        </p>
        <div style="margin: 30px 0; padding: 20px; background-color: #f0f7ff; border-left: 4px solid #4CAF50;">
          <p style="margin: 0;"><strong>School Name:</strong> ${schoolName}</p>
          <p style="margin: 5px 0;"><strong>School Code:</strong> ${schoolCode}</p>
        </div>
        <p style="color: #666; font-size: 16px;">
          You can now start managing your school's fee payments and user accounts.
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    to: string,
    firstName: string,
    amount: string,
    description: string,
  ): Promise<void> {
    const subject = 'Payment Received';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">Payment Received</h1>
        <p style="color: #666; font-size: 16px;">Hello ${firstName},</p>
        <p style="color: #666; font-size: 16px;">
          We have successfully received your payment.
        </p>
        <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
          <p style="margin: 0;"><strong>Amount:</strong> ${amount}</p>
          <p style="margin: 5px 0;"><strong>Description:</strong> ${description}</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          Thank you for using SchoolPay+!
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail(
    to: string,
    firstName: string,
    verificationToken: string,
  ): Promise<void> {
    // Use backend verification endpoint so clicking the link verifies immediately.
    // Note: the API uses a global '/api' prefix (see app.setGlobalPrefix('api') in main.ts),
    // so ensure the base URL includes '/api'. If BACKEND_URL or API_URL already contains
    // a path, we avoid duplicating slashes.
    const rawBase =
      this.configService.get<string>('BACKEND_URL') ||
      this.configService.get<string>('API_URL') ||
      'http://localhost:3000/api';
    const base = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
    const verificationUrl = `${base}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;
    const subject = 'Verify Your Email Address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">Verify Your Email</h1>
        <p style="color: #666; font-size: 16px;">Hello ${firstName},</p>
        <p style="color: #666; font-size: 16px;">
          Thank you for registering with SchoolPay+! Please click the button below to verify your email address.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: #999; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
          ${verificationUrl}
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account with SchoolPay+, please ignore this email.
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }
}
