import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { assertIsSuperAdmin } from './assert-is-super-admin';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async createSchoolAdmin(dto: CreateSchoolAdminDto, user: any) {
        assertIsSuperAdmin(user);

        const { firstName, lastName, email, password, schoolId } = dto;
        if (!firstName || !lastName || !email || !password || !schoolId) {
            throw new BadRequestException('All fields are required.');
        }

        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ConflictException('User with this email already exists.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userRecord = await this.prisma.user.create({
            data: {
                first_name: firstName,
                last_name: lastName,
                email,
                password_hash: hashedPassword,
                role: 'SCHOOL_ADMIN',
                is_active: true,
                email_verified: false,
            },
        });

        await this.prisma.schoolAdmin.create({
            data: {
                school_id: schoolId,
                user_id: userRecord.id,
                is_super_admin: false,
            },
        }).catch(() => { });

        return {
            message: 'School Admin created successfully.',
            user: {
                id: userRecord.id,
                firstName: userRecord.first_name,
                lastName: userRecord.last_name,
                email: userRecord.email,
                role: userRecord.role,
            },
        };
    }
}
