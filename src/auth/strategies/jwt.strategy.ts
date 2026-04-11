import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Check active session by jti
    if (payload.jti) {
      const session = await this.prisma.session.findUnique({
        where: { jti: payload.jti },
      });
      if (!session || !session.is_active || session.expires_at < new Date()) {
        throw new UnauthorizedException('Session is not active');
      }
    }

    const user = await this.usersService.findByEmail(payload.email);

    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Get school_id from payload (already validated in token) or fetch from database
    let schoolId: string | null = payload.school_id || null;

    // If not in payload (for backward compatibility), fetch from database
    if (!schoolId && user.role !== 'SUPER_ADMIN') {
      const schoolAdmin = await this.prisma.schoolAdmin.findFirst({
        where: { user_id: user.id },
        select: { school_id: true },
      });
      schoolId = schoolAdmin?.school_id || null;
    }

    // Return user object without sensitive fields
    return {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      school_id: schoolId,
      phone: user.phone,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
