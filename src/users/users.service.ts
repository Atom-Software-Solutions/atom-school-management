import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import {
  UserResponse,
  UserWithPassword,
} from './interfaces/user-response.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
    });
    if (!rel) {
      throw new ForbiddenException('Insufficient permissions for this school');
    }
  }

  async create(
    createUserDto: CreateUserDto,
    tenantId?: string | null,
    creatorUserId?: string,
  ): Promise<UserResponse> {
    // Validate tenant if provided (for non-SUPER_ADMIN roles)
    if (tenantId && creatorUserId && createUserDto.role !== 'SUPER_ADMIN') {
      await this.assertIsAdminOfSchool(tenantId, creatorUserId);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createUserDto.email)) {
      throw new ConflictException('Invalid email format');
    }

    // Check if user with email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // If phone provided, ensure unique before hitting DB constraint
    if (createUserDto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: createUserDto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('User with this phone already exists');
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create the user
    let user: UserResponse;
    try {
      user = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password_hash: hashedPassword,
          first_name: createUserDto.firstName,
          last_name: createUserDto.lastName,
          role: createUserDto.role,
          phone: createUserDto.phone,
          verification_token: (createUserDto as any).verificationToken || null,
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          phone: true,
          is_active: true,
          email_verified: true,
          verification_token: true,
          created_at: true,
          updated_at: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta?.target[0]
          : undefined;
        if (target === 'phone') {
          throw new ConflictException('User with this phone already exists');
        }
        if (target === 'email') {
          throw new ConflictException('User with this email already exists');
        }
      }
      throw error;
    }

    // If tenantId provided and user is SCHOOL_ADMIN, create SchoolAdmin relationship
    if (tenantId && createUserDto.role === 'SCHOOL_ADMIN') {
      await this.prisma.schoolAdmin
        .create({
          data: {
            school_id: tenantId,
            user_id: user.id,
            is_super_admin: false,
          },
        })
        .catch(() => {
          // Ignore if relationship already exists
        });
    }

    return user;
  }

  async findAll(tenantId?: string | null): Promise<UserResponse[]> {
    const where: any = {};

    // If tenantId is provided (not null), filter by school
    // null means SUPER_ADMIN can see all users
    if (tenantId !== undefined && tenantId !== null) {
      // Get all user_ids for this school from SchoolAdmin relationship
      const schoolAdmins = await this.prisma.schoolAdmin.findMany({
        where: { school_id: tenantId },
        select: { user_id: true },
      });
      const userIds = schoolAdmins.map((sa) => sa.user_id);

      if (userIds.length === 0) {
        // No users in this school
        return [];
      }

      where.id = { in: userIds };
    }
    // If tenantId is null (SUPER_ADMIN), no filter applied - returns all users

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async findOne(id: string, tenantId?: string | null): Promise<UserResponse> {
    const where: any = { id };

    // If tenantId is provided (not null), verify user belongs to this tenant
    if (tenantId !== undefined && tenantId !== null) {
      const schoolAdmin = await this.prisma.schoolAdmin.findFirst({
        where: { user_id: id, school_id: tenantId },
      });

      if (!schoolAdmin) {
        // User doesn't belong to this tenant
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    }
    // If tenantId is null (SUPER_ADMIN), no tenant check - can access any user

    const user = await this.prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        is_active: true,
        email_verified: true,
        verification_token: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  // Return full user record (including verification fields) by id
  async findById(id: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    tenantId?: string | null,
  ): Promise<UserResponse> {
    await this.findOne(id, tenantId); // Check if user exists and belongs to tenant

    const updateData: any = {};
    if (updateUserDto.firstName)
      updateData.first_name = updateUserDto.firstName;
    if (updateUserDto.lastName) updateData.last_name = updateUserDto.lastName;
    if (updateUserDto.phone !== undefined)
      updateData.phone = updateUserDto.phone;
    if (updateUserDto.password) {
      updateData.password_hash = await bcrypt.hash(updateUserDto.password, 10);
    }

    // If no data to update, just update the last_login timestamp
    if (Object.keys(updateData).length === 0) {
      return this.prisma.user.update({
        where: { id },
        data: { last_login: new Date() },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          phone: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async remove(id: string, tenantId?: string | null) {
    await this.findOne(id, tenantId); // Check if user exists and belongs to tenant

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
