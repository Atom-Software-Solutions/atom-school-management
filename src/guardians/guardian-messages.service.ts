import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { GuardianMessage } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuardianMessagesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    private async assertIsAdminOfSchool(schoolId: string, userId: string) {
        const rel = await this.prisma.schoolAdmin.findUnique({
            where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
        });
        if (!rel) {
            throw new ForbiddenException('Insufficient permissions for this school');
        }
    }

    private async sendEmailIfRequested(
        type: string,
        guardianEmail: string | null,
        subject: string | undefined,
        message: string,
    ): Promise<{ status: 'sent' | 'pending' | 'failed'; metadata?: Record<string, unknown> }> {
        if (type !== 'Email') {
            return { status: 'pending', metadata: { channel: type } };
        }

        if (!guardianEmail) {
            return {
                status: 'failed',
                metadata: { error: 'Guardian does not have an email address', channel: type },
            };
        }

        const emailSubject = subject?.trim() || 'SchoolPay+ Notification';
        try {
            await this.emailService.sendEmail({
                to: guardianEmail,
                subject: emailSubject,
                text: message,
            });
            return { status: 'sent', metadata: { channel: type } };
        } catch (error) {
            return {
                status: 'failed',
                metadata: {
                    error: error instanceof Error ? error.message : String(error),
                    channel: type,
                },
            };
        }
    }

    async sendMessageToGuardian(
        guardianId: string,
        adminUserId: string,
        data: {
            type: string;
            category?: string;
            subject?: string;
            message: string;
            studentId?: string;
        },
    ): Promise<GuardianMessage> {
        const guardian = await this.prisma.guardian.findUnique({ where: { id: guardianId } });
        if (!guardian) {
            throw new NotFoundException('Guardian not found');
        }

        await this.assertIsAdminOfSchool(guardian.school_id, adminUserId);

        if (data.studentId) {
            const student = await this.prisma.student.findUnique({ where: { id: data.studentId } });
            if (!student || student.school_id !== guardian.school_id) {
                throw new BadRequestException('Invalid studentId for this guardian');
            }
        }

        const result = await this.sendEmailIfRequested(
            data.type,
            guardian.email ?? null,
            data.subject,
            data.message,
        );

        return this.prisma.guardianMessage.create({
            data: {
                school_id: guardian.school_id,
                guardian_id: guardian.id,
                student_id: data.studentId,
                type: data.type,
                category: data.category,
                subject: data.subject,
                message: data.message,
                status: result.status,
                sent_at: result.status === 'sent' ? new Date() : undefined,
                metadata: result.metadata as any,
            },
        });
    }

    async sendMessageToStudentGuardians(
        studentId: string,
        adminUserId: string,
        data: {
            type: string;
            category?: string;
            subject?: string;
            message: string;
            studentId?: string;
        },
    ): Promise<GuardianMessage[]> {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                guardians: {
                    include: { guardian: true },
                },
            },
        });
        if (!student) {
            throw new NotFoundException('Student not found');
        }

        await this.assertIsAdminOfSchool(student.school_id, adminUserId);

        if (!student.guardians.length) {
            throw new BadRequestException('Student has no linked guardians');
        }

        // Find the primary guardian (assuming is_primary field exists)
        const primaryGuardianRelation = student.guardians.find(g => g.is_primary);
        if (!primaryGuardianRelation) {
            throw new BadRequestException('Student does not have a primary guardian set');
        }

        const guardian = primaryGuardianRelation.guardian;

        const result = await this.sendEmailIfRequested(
            data.type,
            guardian.email ?? null,
            data.subject,
            data.message,
        );

        const record = await this.prisma.guardianMessage.create({
            data: {
                school_id: student.school_id,
                guardian_id: guardian.id,
                student_id: student.id,
                type: data.type,
                category: data.category,
                subject: data.subject,
                message: data.message,
                status: result.status,
                sent_at: result.status === 'sent' ? new Date() : undefined,
                metadata: {
                    ...(result.metadata as any),
                    isPrimary: true,
                },
            },
        });

        return [record];
    }

    async bulkSendMessages(
        data: {
            guardianIds: string[];
            type: string;
            category?: string;
            subject?: string;
            message: string;
            studentId?: string;
        },
        adminUserId: string,
    ): Promise<GuardianMessage[]> {
        const guardians = await this.prisma.guardian.findMany({
            where: { id: { in: data.guardianIds } },
        });

        if (guardians.length !== data.guardianIds.length) {
            throw new BadRequestException('One or more guardians were not found');
        }

        const schoolId = guardians[0].school_id;
        for (const guardian of guardians) {
            if (guardian.school_id !== schoolId) {
                throw new BadRequestException('All guardians must belong to the same school');
            }
        }

        await this.assertIsAdminOfSchool(schoolId, adminUserId);

        const messages: GuardianMessage[] = [];
        for (const guardian of guardians) {
            const result = await this.sendEmailIfRequested(
                data.type,
                guardian.email ?? null,
                data.subject,
                data.message,
            );

            const record = await this.prisma.guardianMessage.create({
                data: {
                    school_id: schoolId,
                    guardian_id: guardian.id,
                    student_id: data.studentId,
                    type: data.type,
                    category: data.category,
                    subject: data.subject,
                    message: data.message,
                    status: result.status,
                    sent_at: result.status === 'sent' ? new Date() : undefined,
                    metadata: result.metadata as any,
                },
            });
            messages.push(record);
        }

        return messages;
    }

    async listMessagesForGuardian(
        guardianId: string,
        adminUserId: string,
    ): Promise<GuardianMessage[]> {
        const guardian = await this.prisma.guardian.findUnique({ where: { id: guardianId } });
        if (!guardian) {
            throw new NotFoundException('Guardian not found');
        }

        await this.assertIsAdminOfSchool(guardian.school_id, adminUserId);

        return this.prisma.guardianMessage.findMany({
            where: { guardian_id: guardianId },
            orderBy: { created_at: 'desc' },
        });
    }

    async getMessage(
        guardianId: string,
        messageId: string,
        adminUserId: string,
    ): Promise<GuardianMessage> {
        const guardian = await this.prisma.guardian.findUnique({ where: { id: guardianId } });
        if (!guardian) {
            throw new NotFoundException('Guardian not found');
        }

        await this.assertIsAdminOfSchool(guardian.school_id, adminUserId);

        const message = await this.prisma.guardianMessage.findUnique({
            where: { id: messageId },
        });
        if (!message || message.guardian_id !== guardianId) {
            throw new NotFoundException('Message not found');
        }
        return message;
    }
}

