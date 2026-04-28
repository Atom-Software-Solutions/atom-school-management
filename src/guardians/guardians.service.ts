import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuardiansService {
    constructor(private readonly prisma: PrismaService) { }

    private async assertIsAdminOfSchool(schoolId: string, userId: string) {
        const rel = await this.prisma.schoolAdmin.findUnique({
            where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
        });
        if (!rel) {
            throw new ForbiddenException('Insufficient permissions for this school');
        }
    }

    async listAll(schoolId: string, adminUserId: string) {
        await this.assertIsAdminOfSchool(schoolId, adminUserId);
        return this.prisma.guardian.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' },
            include: {
                students: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                student_no: true,
                                reg_no: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async getOne(id: string, adminUserId: string) {
        const guardian = await this.prisma.guardian.findUnique({
            where: { id },
            include: {
                students: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                student_no: true,
                                reg_no: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });
        if (!guardian) throw new NotFoundException('Guardian not found');
        await this.assertIsAdminOfSchool(guardian.school_id, adminUserId);
        return guardian;
    }

    async create(
        data: {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            students: { id: string; relation?: string; is_primary?: boolean }[];
        },
        adminUserId: string,
    ) {
        // Find school from first student
        const firstStudent = await this.prisma.student.findUnique({
            where: { id: data.students[0].id },
        });
        if (!firstStudent) throw new BadRequestException('Invalid student ID');
        await this.assertIsAdminOfSchool(firstStudent.school_id, adminUserId);

        // Ensure all students belong to same school
        const studentIds = data.students.map(s => s.id);
        const students = await this.prisma.student.findMany({
            where: { id: { in: studentIds }, school_id: firstStudent.school_id },
        });
        if (students.length !== data.students.length) {
            throw new BadRequestException('All students must belong to the same school');
        }

        // Create guardian and link to students, enforcing single primary per student
        return this.prisma.$transaction(async (tx) => {
            const guardian = await tx.guardian.create({
                data: {
                    school_id: firstStudent.school_id,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    phone: data.phone,
                },
            });
            for (const studentRel of data.students) {
                if (studentRel.is_primary) {
                    // unset existing primary guardians for the student
                    await tx.studentGuardian.updateMany({
                        where: { student_id: studentRel.id, is_primary: true },
                        data: { is_primary: false },
                    });
                }
                await tx.studentGuardian.create({
                    data: {
                        student_id: studentRel.id,
                        guardian_id: guardian.id,
                        relation: studentRel.relation,
                        is_primary: studentRel.is_primary ?? false,
                    },
                });
            }
            return guardian;
        });
    }

    async update(
        id: string,
        data: {
            firstName?: string;
            lastName?: string;
            email?: string;
            phone?: string;
        },
        adminUserId: string,
    ) {
        const guardian = await this.prisma.guardian.findUnique({ where: { id } });
        if (!guardian) throw new NotFoundException('Guardian not found');
        await this.assertIsAdminOfSchool(guardian.school_id, adminUserId);

        return this.prisma.guardian.update({
            where: { id },
            data: {
                first_name: data.firstName ?? undefined,
                last_name: data.lastName ?? undefined,
                email: data.email ?? undefined,
                phone: data.phone ?? undefined,
            },
        });
    }

    async archive(id: string, adminUserId: string) {
        const guardian = await this.prisma.guardian.findUnique({ where: { id } });
        if (!guardian) throw new NotFoundException('Guardian not found');
        await this.assertIsAdminOfSchool(guardian.school_id, adminUserId);

        // Soft delete: you may want to add an is_active or deleted_at field for real archiving
        return this.prisma.guardian.update({
            where: { id },
            data: { email: null, phone: null }, // Example: anonymize contact info
        });
    }

    async addGuardianToStudent(
        studentId: string,
        adminUserId: string,
        data: {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            relation?: string;
            is_primary?: boolean;
        },
    ) {
        // Find student and check admin rights
        const student = await this.prisma.student.findUnique({ where: { id: studentId } });
        if (!student || student.deleted_at) {
            throw new NotFoundException('Student not found');
        }
        await this.assertIsAdminOfSchool(student.school_id, adminUserId);

        // Create guardian and link within a transaction to enforce single primary
        return this.prisma.$transaction(async (tx) => {
            const guardian = await tx.guardian.create({
                data: {
                    school_id: student.school_id,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    phone: data.phone,
                },
            });

            if (data.is_primary) {
                // unset existing primary guardian for this student
                await tx.studentGuardian.updateMany({
                    where: { student_id: student.id, is_primary: true },
                    data: { is_primary: false },
                });
            }

            await tx.studentGuardian.create({
                data: {
                    student_id: student.id,
                    guardian_id: guardian.id,
                    relation: data.relation,
                    is_primary: data.is_primary ?? false,
                },
            });

            return guardian;
        });
    }

    async delete(id: string, adminUserId: string) {
        // Find guardian and check admin rights
        const guardian = await this.prisma.guardian.findUnique({ where: { id } });
        if (!guardian) throw new NotFoundException('Guardian not found');
        await this.assertIsAdminOfSchool(guardian.school_id, adminUserId);

        // Delete related StudentGuardian and GuardianMessage records
        await this.prisma.studentGuardian.deleteMany({ where: { guardian_id: id } });
        await this.prisma.guardianMessage.deleteMany({ where: { guardian_id: id } });

        // Delete the guardian
        return this.prisma.guardian.delete({ where: { id } });
    }
}
