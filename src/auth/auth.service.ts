import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const createUserDto = {
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: registerDto.role,
      phone: registerDto.phone,
      schoolId: registerDto.schoolId,
    };

    const user = await this.usersService.create(createUserDto);
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
        schoolId: user.school_id,
      },
    };
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
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        schoolId: user.school_id,
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
