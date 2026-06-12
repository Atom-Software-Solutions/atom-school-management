import { ForbiddenException, Injectable } from '@nestjs/common';
import { ReportCardData } from './report-card-2.component';
import { ReportCardsService } from './report-cards.service';

@Injectable()
export class ReportCard2DataService {
    constructor(private readonly reportCardsService: ReportCardsService) { }

    /**
     * Build data shaped like exampleData2 for ReportCard2
     * Ensures each subject has at least 2 components (duplicates subject score/grade if needed)
     * Returns both individual component grades and computed subject average/grade/credits.
     */
    async buildReportCard2Data(
        schoolId: string,
        identity: string,
        yearId: string,
        termId: string,
        req: any,
    ): Promise<ReportCardData> {
        if (!req.user) throw new ForbiddenException('Authentication required');

        // reuse existing ReportCardsService to fetch base data from DB
        const base = await this.reportCardsService.getReportCardByIdentity(
            schoolId,
            req.user.id,
            yearId,
            termId,
            identity,
        );

        // normalize subjects -> ensure components array with at least 2 entries
        const subjects = (base.subjects || []).map((s: any) => {
            let components: Array<any> = [];

            if (Array.isArray(s.components) && s.components.length >= 1) {
                components = s.components.map((c: any) => ({
                    name: c.name,
                    score: typeof c.score === 'number' ? c.score : (c.score ? Number(c.score) : undefined),
                    grade: c.grade,
                    credits: typeof c.credits === 'number' ? c.credits : (c.credits ? Number(c.credits) : undefined),
                    remarks: c.remarks || '',
                }));
            } else {
                // single-entry subject -> create two components duplicating score/grade (split credits if present)
                const score = typeof s.score === 'number' ? s.score : (s.score ? Number(s.score) : undefined);
                const grade = s.grade ?? undefined;
                const credits = typeof s.credits === 'number' ? s.credits : (s.credits ? Number(s.credits) : undefined);
                const halfCredits = credits !== undefined ? credits / 2 : undefined;

                components = [
                    {
                        name: 'Paper 1',
                        score,
                        grade,
                        credits: halfCredits,
                        remarks: s.remarks ?? '',
                    },
                    {
                        name: 'Paper 2',
                        score,
                        grade,
                        credits: halfCredits,
                        remarks: s.remarks ?? '',
                    },
                ];
            }

            // compute subject-level aggregates from components
            const numericScores = components.map(c => (typeof c.score === 'number' ? c.score : NaN)).filter(n => !Number.isNaN(n));
            const avg = numericScores.length > 0 ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length) : undefined;
            const roundedAvg = typeof avg === 'number' ? Math.round(avg * 100) / 100 : undefined;

            const totalCredits = components.reduce((sum, c) => {
                const cr = typeof c.credits === 'number' ? c.credits : 0;
                return sum + cr;
            }, 0);

            const subjectGrade = (typeof roundedAvg === 'number') ? this.calculateLetterGrade(roundedAvg) : (s.grade ?? undefined);
            const remark = (typeof roundedAvg === 'number') ? this.getRemarkForScore(roundedAvg) : (s.remarks ?? '');

            return {
                name: s.name,
                // keep individual components for display
                components,
                // also return aggregated fields for summary / easy access
                score: roundedAvg,
                grade: subjectGrade,
                credits: totalCredits || (s.credits ?? undefined),
                remarks: remark,
            };
        });

        // return full structure keeping other fields from base
        return {
            school: base.school,
            term: base.term,
            student: base.student,
            subjects,
            summary: base.summary,
            attendance: base.attendance,
            conduct: base.conduct,
            activities: base.activities,
            comments: base.comments,
            grading: base.grading,
        } as ReportCardData;
    }

    private calculateLetterGrade(percentage: number): string {
        if (percentage >= 90) return 'A+';
        if (percentage >= 85) return 'A';
        if (percentage >= 75) return 'B+';
        if (percentage >= 70) return 'B';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }

    private getRemarkForScore(score: number): string {
        if (score >= 90) return 'Outstanding';
        if (score >= 80) return 'Excellent';
        if (score >= 75) return 'Very Good';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Credit';
        if (score >= 50) return 'Pass';
        return 'Fail';
    }
}
