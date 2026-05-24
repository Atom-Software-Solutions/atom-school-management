import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { assertIsSuperAdmin } from './assert-is-super-admin';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';

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

    async listSchoolAdmins(user: any, schoolId?: string) {
        let userIds: string[] | undefined = undefined;

        if (user.role === 'SCHOOL_ADMIN') {
            // School Admins can only see admins in their own school
            const schoolAdmins = await this.prisma.schoolAdmin.findMany({
                where: { school_id: user.school_id },
                select: { user_id: true },
            });
            userIds = schoolAdmins.map(sa => sa.user_id);
            if (userIds.length === 0) return [];
        } else if (user.role === 'SUPER_ADMIN') {
            // Super Admins can filter by schoolId, or see all if not provided
            if (schoolId) {
                const schoolAdmins = await this.prisma.schoolAdmin.findMany({
                    where: { school_id: schoolId },
                    select: { user_id: true },
                });
                userIds = schoolAdmins.map(sa => sa.user_id);
                if (userIds.length === 0) return [];
            }
        } else {
            throw new ForbiddenException('You do not have permission to view these admins.');
        }

        const userWhere: any = { role: 'SCHOOL_ADMIN', is_active: true };
        if (userIds) {
            userWhere.id = { in: userIds };
        }

        const admins = await this.prisma.user.findMany({
            where: userWhere,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                is_active: true,
                email_verified: true,
                created_at: true,
            },
        });

        return admins.map(a => ({
            id: a.id,
            firstName: a.first_name,
            lastName: a.last_name,
            email: a.email,
            isActive: a.is_active,
            emailVerified: a.email_verified,
            createdAt: a.created_at,
        }));
    }

    async listSuperAdmins(user: any) {
        if (user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('You do not have permission to view these admins.');
        }
        const admins = await this.prisma.user.findMany({
            where: { role: 'SUPER_ADMIN', is_active: true },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                is_active: true,
                email_verified: true,
                created_at: true,
            },
        });
        return admins.map(a => ({
            id: a.id,
            firstName: a.first_name,
            lastName: a.last_name,
            email: a.email,
            isActive: a.is_active,
            emailVerified: a.email_verified,
            createdAt: a.created_at,
        }));
    }
}
