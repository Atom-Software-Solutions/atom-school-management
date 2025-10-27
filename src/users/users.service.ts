import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserResponse, UserWithPassword } from './interfaces/user-response.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    // Check if user with email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password_hash: hashedPassword,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        role: createUserDto.role,
        phone: createUserDto.phone,
        school_id: createUserDto.schoolId,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        school_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    return user;
  }

  async findAll(): Promise<UserResponse[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        school_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        school_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    await this.findOne(id); // Check if user exists

    const updateData: any = {};
    if (updateUserDto.firstName)
      updateData.first_name = updateUserDto.firstName;
    if (updateUserDto.lastName) updateData.last_name = updateUserDto.lastName;
    if (updateUserDto.phone !== undefined)
      updateData.phone = updateUserDto.phone;
    if (updateUserDto.schoolId) updateData.school_id = updateUserDto.schoolId;
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
          school_id: true,
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
        school_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if user exists

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
