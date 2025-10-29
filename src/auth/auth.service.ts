import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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
  ) {}

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
    
    // Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      user.first_name,
      verificationToken,
    );

    const accessToken = await this.generateAccessToken(user);

    return {
      accessToken,
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

    if (!user) {
      throw new NotFoundException('Invalid or expired verification token');
    }

    if (user.email_verified) {
      return { message: 'Email already verified' };
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

    return { message: 'Email verified successfully' };
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

    return {
      accessToken,
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

  private async generateAccessToken(user: { id: string; email: string; role: string }) {
    const jti = randomUUID();
    // sign to get exp
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role, jti } as JwtPayload);
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

  async revokeSessionByJti(jti?: string) {
    if (!jti) return;
    await this.prisma.session
      .update({
        where: { jti },
        data: { is_active: false, revoked_at: new Date() },
      })
      .catch(() => undefined);
  }
}
