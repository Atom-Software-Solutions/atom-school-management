import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Query,
  Res,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { ProfileResponseDto } from './dto/profile-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: false,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  )
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        access_token: 'jwt-token-here',
        refresh_token: 'refresh-token-here',
        user: {
          id: 'user-uuid',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'SCHOOL_ADMIN',
          phone: '1234567890',
          emailVerified: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - combined validation errors',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Email must be a valid email address',
          'Password must be at least 8 characters long',
          'First name is required',
          'Last name is required',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'jwt-token-here',
        refresh_token: 'refresh-token-here',
        user: {
          id: 'user-uuid',
          email: 'user@example.com',
          role: 'SCHOOL_ADMIN',
          first_name: 'John',
          last_name: 'Doe',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: 'user-uuid',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'SCHOOL_ADMIN',
        phone: '1234567890',
        isActive: true,
        lastLogin: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: AuthenticatedRequest): Promise<ProfileResponseDto> {
    const user = req.user;
    if (!user) {
      throw new Error('User not authenticated');
    }
    const memberships = await this.authService.getUserMemberships(user.id);
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      phone: user.phone,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      memberships,
    } as ProfileResponseDto;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req: any) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (token) {
      const decoded: any = this.authService['jwtService'].decode(token);
      await this.authService.revokeSessionByJti(decoded?.jti);
    }
    return { message: 'Logged out successfully' };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address using verification token' })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Email verification token',
    example: 'verification-token-here',
  })
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const result = await this.authService.verifyEmail(token);

    const baseUrl = process.env.FRONTEND_URL;

    switch (result.status) {
      case 'success':
        return res.redirect(`${baseUrl}/schools/create`);

      case 'already_verified':
        return res.redirect(`${baseUrl}/verify-email?status=already_verified`);

      default:
        return res.redirect(`${baseUrl}/verify-email?status=invalid`);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        access_token: 'new-jwt-token-here',
        refresh_token: 'new-refresh-token-here',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists)',
    schema: {
      example: {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password has been reset successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resend email verification link to current user' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      example: {
        message: 'Verification email has been sent',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email is already verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendVerification(@Request() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return this.authService.resendVerificationEmail(user.id);
  }
}
