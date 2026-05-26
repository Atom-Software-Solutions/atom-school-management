import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    async getSchoolDashboard(schoolId: string) {
        // Dates for filtering
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        firstDayOfWeek.setHours(0, 0, 0, 0);

        // Students
        const [studentsTotal, studentsNewThisMonth] = await Promise.all([
            this.prisma.student.count({ where: { school_id: schoolId, is_active: true } }),
            this.prisma.student.count({
                where: {
                    school_id: schoolId,
                    is_active: true,
                    created_at: { gte: firstDayOfMonth }
                }
            }),
        ]);

        // Teachers
        const [teachersTotal, teachersNewThisWeek] = await Promise.all([
            this.prisma.user.count({
                where: {
                    role: Role.SCHOOL_ADMIN,
                    is_active: true,
                    adminOf: { some: { school_id: schoolId } }
                }
            }),
            this.prisma.user.count({
                where: {
                    role: Role.SCHOOL_ADMIN,
                    is_active: true,
                    adminOf: { some: { school_id: schoolId } },
                    created_at: { gte: firstDayOfWeek }
                }
            }),
        ]);

        // Guardians
        const guardiansTotal = await this.prisma.guardian.count({ where: { school_id: schoolId } });

        // Guardian Messages (sent this month, failed this month)
        const [messagesSentThisMonth, failedMessagesThisMonth] = await Promise.all([
            this.prisma.guardianMessage.count({
                where: {
                    school_id: schoolId,
                    status: 'sent',
                    created_at: { gte: firstDayOfMonth }
                }
            }),
            this.prisma.guardianMessage.count({
                where: {
                    school_id: schoolId,
                    status: 'failed',
                    created_at: { gte: firstDayOfMonth }
                }
            }),
        ]);

        // Academics
        // Get current academic year (latest started, not ended)
        const currentAcademicYear = await this.prisma.academicYear.findFirst({
            where: {
                school_id: schoolId,
                start_date: { lte: now },
                end_date: { gte: now }
            },
            orderBy: { start_date: 'desc' }
        });

        // Get current term (latest term_template_item in current academic year)
        let currentTerm: string | null = null;
        if (currentAcademicYear) {
            const term = await this.prisma.termTemplateItem.findFirst({
                where: {
                    term_template_id: currentAcademicYear.term_template_id,
                    start_date: { lte: now },
                    end_date: { gte: now }
                },
                orderBy: { ordinal: 'desc' }
            });
            currentTerm = term?.name ?? null;
        }

        const [subjects, classes, assessments, grades, reportCardsGenerated] = await Promise.all([
            this.prisma.subject.count({ where: { school_id: schoolId, is_active: true } }),
            this.prisma.classroomDefinition.count({ where: { school_id: schoolId, is_archived: false } }),
            this.prisma.assessment.count({
                where: {
                    component: {
                        subject: {
                            school_id: schoolId,
                        },
                    },
                    ...(currentAcademicYear && { academic_year_id: currentAcademicYear.id })
                }
            }),
            this.prisma.grade.count({
                where: {
                    school_id: schoolId,
                    ...(currentAcademicYear && { assessment: { academic_year_id: currentAcademicYear.id } })
                }
            }),
            this.prisma.reportCard.count({
                where: {
                    school_id: schoolId,
                    ...(currentAcademicYear && { academic_year_id: currentAcademicYear.id })
                }
            }),
        ]);

        // Finance (not implemented: Payment/Invoice models are not in schema)
        // Alerts (static for now)
        const alerts = [
            {
                type: "maintenance",
                message: "Scheduled maintenance for server cluster B at 2:00 AM."
            },
            {
                type: "message_failed",
                message: `${failedMessagesThisMonth} guardian messages failed to send this month.`
            },
            {
                type: "sent_messages",
                message: `${messagesSentThisMonth} guardian messages sent this month.`
            }
        ];

        return {
            students: {
                total: studentsTotal,
                new_this_month: studentsNewThisMonth,
                // attendance_rate: ... // Not implemented, needs attendance model
            },
            teachers: {
                total: teachersTotal,
                new_this_week: teachersNewThisWeek
            },
            guardians: {
                total: guardiansTotal,
                messages_sent_this_month: messagesSentThisMonth,
                failed_messages_this_month: failedMessagesThisMonth
            },
            academics: {
                current_year: currentAcademicYear?.name ?? null,
                current_term: currentTerm,
                subjects,
                classes,
                assessments,
                grades,
                report_cards_generated: reportCardsGenerated
            },
            // finance: { ... } // Not implemented
            alerts
        };
    }
}
