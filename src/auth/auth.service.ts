import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  async register(registerDto: RegisterDto) {
    // Generate verification token
    const verificationToken = randomUUID();

    // Force role to SCHOOL_ADMIN for self-registration
    const createUserDto = {
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: 'SCHOOL_ADMIN' as const,
      phone: registerDto.phone,
      schoolId: registerDto.schoolId,
      verificationToken: verificationToken,
    };

    const user = await this.usersService.create(createUserDto);

    // Send verification email (best-effort only; do not fail registration if email sending fails)
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.first_name,
        verificationToken,
      );
    } catch (error) {
      // Log and continue. In local/dev environments email may not be configured.
      // The user can still be verified manually via the /auth/verify-email endpoint.
      console.error('Failed to send verification email:', (error as any)?.message ?? error);
    }

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    // Fetch memberships (schools the user is related to)
    const memberships = await this.getUserMemberships(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      memberships,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        emailVerified: user.email_verified,
      },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verification_token: token },
    });

    // If the token is invalid or has already been consumed, respond gracefully
    // instead of throwing a 404. This covers cases where the user clicks the link
    // multiple times or the token has expired/been cleared.
    if (!user) {
      return { status: 'invalid' };
    }

    if (user.email_verified) {
      return { status: 'already_verified' };
    }

    // Update user as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        email_verified_at: new Date(),
        verification_token: null, // Clear the token after use
      },
    });

    return { success: 'success' };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last login time
    await this.usersService.update(user.id, {});

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    // Fetch memberships (schools the user is related to)
    const memberships = await this.getUserMemberships(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      memberships,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  private async getUserSchoolId(userId: string, role: string): Promise<string | null> {
    // SUPER_ADMIN doesn't belong to a specific school
    if (role === 'SUPER_ADMIN') {
      return null;
    }

    // For other roles, get their school_id from SchoolAdmin relationship
    const schoolAdmin = await this.prisma.schoolAdmin.findFirst({
      where: { user_id: userId },
      select: { school_id: true },
    });

    return schoolAdmin?.school_id || null;
  }

  // Return all schools the user has an admin relationship with.
  async getUserMemberships(userId: string): Promise<Array<{ schoolId: string; schoolName: string; role: string }>> {
    const rels = await this.prisma.schoolAdmin.findMany({
      where: { user_id: userId },
      include: { school: { select: { id: true, name: true } } },
    });

    return rels.map(r => ({
      schoolId: r.school.id,
      schoolName: r.school.name,
      role: r.is_super_admin ? 'super_admin' : 'admin',
    }));
  }

  private async generateAccessToken(user: { id: string; email: string; role: string }) {
    const jti = randomUUID();
    const schoolId = await this.getUserSchoolId(user.id, user.role);

    // sign to get exp
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      school_id: schoolId || undefined,
      jti
    } as JwtPayload);
    const decoded: any = this.jwtService.decode(token);
    const expSeconds: number | undefined = decoded?.exp;
    const expiresAt = expSeconds ? new Date(expSeconds * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000);

    await this.prisma.session.create({
      data: {
        user_id: user.id,
        jti,
        is_active: true,
        expires_at: expiresAt,
      },
    });

    return token;
  }

  private async generateRefreshToken(user: { id: string; email: string; role: string }) {
    const jti = randomUUID();
    // Refresh token expires in 30 days
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    const schoolId = await this.getUserSchoolId(user.id, user.role);

    // Create a refresh token payload (different from access token)
    const refreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      school_id: schoolId || undefined,
      jti,
      type: 'refresh',
    };

    const token = this.jwtService.sign(refreshPayload, { expiresIn: '30d' });

    // Store refresh token in session
    await this.prisma.session.create({
      data: {
        user_id: user.id,
        jti,
        is_active: true,
        expires_at: expiresAt,
      },
    });

    return token;
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verify and decode the refresh token
      const payload = this.jwtService.verify(refreshTokenDto.refresh_token) as any;

      // Check if it's a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if session is still active
      const session = await this.prisma.session.findUnique({
        where: { jti: payload.jti },
      });

      if (!session || !session.is_active || session.expires_at < new Date()) {
        throw new UnauthorizedException('Refresh token expired or revoked');
      }

      // Get user
      const user = await this.usersService.findByEmail(payload.email);
      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const accessToken = await this.generateAccessToken(user);

      // Optionally rotate refresh token (generate new one)
      const newRefreshToken = await this.generateRefreshToken(user);

      // Revoke old refresh token session
      await this.revokeSessionByJti(payload.jti);

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Still return success to prevent email enumeration
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = randomUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.first_name,
        resetToken,
      );
    } catch (error) {
      // Log error but don't reveal it to user
      console.error('Failed to send password reset email:', error);
    }

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Find user by reset token
    const user = await this.prisma.user.findUnique({
      where: { password_reset_token: resetPasswordDto.token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (!user.password_reset_expires || user.password_reset_expires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    // Revoke all existing sessions for security
    await this.prisma.session.updateMany({
      where: { user_id: user.id, is_active: true },
      data: { is_active: false, revoked_at: new Date() },
    });

    return {
      message: 'Password has been reset successfully',
    };
  }

  async revokeSessionByJti(jti?: string) {
    if (!jti) return;
    await this.prisma.session
      .update({
        where: { jti },
        data: { is_active: false, revoked_at: new Date() },
      })
      .catch(() => undefined);
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate a new verification token
    const verificationToken = randomUUID();

    // Update user with new verification token
    await this.prisma.user.update({
      where: { id: userId },
      data: { verification_token: verificationToken },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.first_name,
        verificationToken,
      );
    } catch (error) {
      console.error('Failed to send verification email:', (error as any)?.message ?? error);
      throw new Error('Failed to send verification email');
    }

    return {
      message: 'Verification email has been sent',
    };
  }
}
