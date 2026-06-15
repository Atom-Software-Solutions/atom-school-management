import React from 'react';

// Type definitions (kept similar to report-card.component)
export interface ReportCardConfig {
    showCredits: boolean;
    useGPA: boolean;
    showRank: boolean;
    showAttendance: boolean;
    showConduct: boolean;
    showActivities: boolean;
}

export interface ReportCardData {
    school: { name: string; contact: string; motto: string };
    term: { name: string; year: string; dates: string };
    student: { name: string; regNo: string; class: string; stream: string };
    subjects: Array<{
        name: string;
        score?: number;
        grade?: string;
        credits?: number;
        remarks?: string;
        components?: Array<{
            name: string;
            score?: number;
            grade?: string;
            credits?: number;
            remarks?: string;
        }>;
    }>;
    summary: {
        totalMarks: number;
        totalCredits?: number;
        average: number;
        gpa?: number;
        division?: string;
        rank?: number;
    };
    attendance?: { present: number; absent: number };
    conduct?: string;
    activities?: string;
    comments?: { teacher?: string; head?: string };
    grading?: Array<{ label: string; range: string; description: string }>;
}

// Minimal components reused from report-card.component style
function Header({ school, term, student }: { school: ReportCardData['school']; term: ReportCardData['term']; student: ReportCardData['student'] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                <div style={{ width: 96, height: 96, backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 12, color: '#6b7280', border: '1px solid #ccc', marginRight: 16 }}>Logo</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, textTransform: 'uppercase', color: '#111827', textAlign: 'center' }}>{school.name}</h1>
                    <div style={{ fontSize: 14, color: '#374151', textAlign: 'center' }}>{school.contact}</div>
                    <div style={{ fontStyle: 'italic', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{school.motto}</div>
                </div>
                <div style={{ width: 96, height: 96, backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 12, color: '#6b7280', border: '1px solid #ccc', marginLeft: 16, overflow: 'hidden' }}>Avatar</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, gap: 24, fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{term.name}</span>
                <span>Academic Year: {term.year}</span>
                <span>Dates: {term.dates}</span>
            </div>
        </div>
    );
}

function StudentInfo({ student }: { student: ReportCardData['student'] }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16, fontSize: 14 }}>
            <div><strong>Name:</strong> {student.name}</div>
            <div><strong>Reg No:</strong> {student.regNo}</div>
            <div><strong>Class/Program:</strong> {student.class}</div>
            <div><strong>Stream/Dept:</strong> {student.stream}</div>
        </div>
    );
}

function AcademicTable({ subjects, showCredits }: { subjects: ReportCardData['subjects']; showCredits: boolean }) {
    return (
        <table style={{ width: '100%', border: '1px solid #9ca3af', marginBottom: 16, fontSize: 14, borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
                <tr>
                    <th style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>Subject</th>
                    <th style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>Paper</th>
                    <th style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>Score</th>
                    <th style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>Grade</th>
                    {showCredits && <th style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>Credits</th>}
                    <th style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>Remarks</th>
                </tr>
            </thead>
            <tbody>
                {subjects.map((subj, subjIdx) =>
                    Array.isArray(subj.components) && subj.components.length > 0 ? (
                        subj.components.map((comp, compIdx) => (
                            <tr key={`${subjIdx}-${compIdx}`}>
                                {compIdx === 0 ? (
                                    <td style={{ border: '1px solid #9ca3af', padding: '8px 4px' }} rowSpan={subj.components ? subj.components.length : 1}>
                                        {subj.name}
                                    </td>
                                ) : null}
                                <td style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>{comp.name}</td>
                                <td style={{ border: '1px solid #9ca3af', padding: '8px 4px', textAlign: 'center' }}>{comp.score ?? '-'}</td>
                                <td style={{ border: '1px solid #9ca3af', padding: '8px 4px', textAlign: 'center' }}>{comp.grade ?? '-'}</td>
                                {showCredits && <td style={{ border: '1px solid #9ca3af', padding: '8px 4px', textAlign: 'center' }}>{comp.credits ?? '-'}</td>}
                                <td style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>{comp.remarks ?? ''}</td>
                            </tr>
                        ))
                    ) : (
                        <tr key={subjIdx}>
                            <td style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>{subj.name}</td>
                            <td style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>-</td>
                            <td style={{ border: '1px solid #9ca3af', padding: '8px 4px', textAlign: 'center' }}>{subj.score ?? '-'}</td>
                            <td style={{ border: '1px solid #9ca3af', padding: '8px 4px', textAlign: 'center' }}>{subj.grade ?? '-'}</td>
                            {showCredits && <td style={{ border: '1px solid #9ca3af', padding: '8px 4px', textAlign: 'center' }}>{subj.credits ?? '-'}</td>}
                            <td style={{ border: '1px solid #9ca3af', padding: '8px 4px' }}>{subj.remarks ?? ''}</td>
                        </tr>
                    )
                )}
            </tbody>
        </table>
    );
}

function PerformanceSummary({ summary, config }: { summary: ReportCardData['summary']; config: ReportCardConfig }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, fontSize: 14 }}>
            <div><strong>Total Marks:</strong> {summary.totalMarks}</div>
            {config.showCredits && <div><strong>Total Credits:</strong> {summary.totalCredits ?? '-'}</div>}
            <div><strong>Average:</strong> {summary.average}</div>
            {config.useGPA ? <div><strong>GPA:</strong> {summary.gpa ?? '-'}</div> : <div><strong>Division:</strong> {summary.division ?? '-'}</div>}
            {config.showRank && <div><strong>Position:</strong> {summary.rank ?? '-'}</div>}
        </div>
    );
}

function Comments({ comments }: { comments?: ReportCardData['comments'] }) {
    if (!comments) return null;
    return (
        <div style={{ marginBottom: 16, fontSize: 14 }}>
            <div><strong>Teacher's Remark:</strong> {comments.teacher ?? ''}</div>
            <div><strong>Head Teacher/Dean Remark:</strong> {comments.head ?? ''}</div>
        </div>
    );
}

export default function ReportCard2({ data, config }: { data: ReportCardData; config: ReportCardConfig }) {
    return (
        <div style={{ width: '210mm', margin: '0 auto', backgroundColor: 'white', padding: 32, color: '#111827' }}>
            <Header school={data.school} term={data.term} student={data.student} />
            <StudentInfo student={data.student} />
            <AcademicTable subjects={data.subjects} showCredits={config.showCredits} />
            <PerformanceSummary summary={data.summary} config={config} />
            {config.showAttendance && data.attendance && <div style={{ marginBottom: 8, fontSize: 14 }}><strong>Attendance:</strong> Present: {data.attendance.present}, Absent: {data.attendance.absent}</div>}
            {config.showConduct && data.conduct && <div style={{ marginBottom: 8, fontSize: 14 }}><strong>Conduct:</strong> {data.conduct}</div>}
            {config.showActivities && data.activities && <div style={{ marginBottom: 8, fontSize: 14 }}><strong>Co-curricular Activities:</strong> {data.activities}</div>}
            <Comments comments={data.comments} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 80, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}><div style={{ borderTop: '2px solid #9ca3af', width: 160, height: 0 }} /><div style={{ fontSize: 12, marginTop: 4 }}>Class Teacher</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ borderTop: '2px solid #9ca3af', width: 160, height: 0 }} /><div style={{ fontSize: 12, marginTop: 4 }}>Head Teacher / Dean</div></div>
            </div>
            {data.grading && data.grading.length > 0 && (
                <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #ccc', fontSize: 12, color: '#374151' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Grading Scale:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                        {data.grading.map((g, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{g.label}</span>
                                <span>({g.range})</span>
                                <span>- {g.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Dummy example data and config
export const exampleConfig2: ReportCardConfig = {
    showCredits: true,
    useGPA: true,
    showRank: true,
    showAttendance: true,
    showConduct: true,
    showActivities: true,
};

export const exampleData2: ReportCardData = {
    school: {
        name: "Atom Software School",
        contact: "Backend Office | Tel: +256 700 000000 | backend@example.com",
        motto: "Learning by Doing",
    },
    term: {
        name: "Mid Term",
        year: "2026",
        dates: "Jan 10 – Mar 20, 2026",
    },
    student: {
        name: "Backend Student",
        regNo: "BCK/2026/0001",
        class: "S.3",
        stream: "North",
    },
    subjects: [
        {
            name: "Mathematics",
            components: [
                { name: "Paper 1", score: 78, grade: "A", credits: 2, remarks: "Good" },
                { name: "Paper 2", score: 80, grade: "A", credits: 2, remarks: "Very Good" },
            ],
        },
        {
            name: "Physics",
            components: [
                { name: "Theory", score: 72, grade: "B+", credits: 1.5, remarks: "Very Good" },
                { name: "Practical", score: 70, grade: "B", credits: 1.5, remarks: "Good" },
            ],
        },
        {
            name: "Chemistry",
            components: [
                { name: "Theory", score: 68, grade: "B", credits: 1.5, remarks: "Good" },
                { name: "Practical", score: 66, grade: "C+", credits: 1.5, remarks: "Fair" },
            ],
        },
        {
            name: "Literature",
            components: [
                { name: "Paper 1", score: 82, grade: "A", credits: 1, remarks: "Excellent" },
                { name: "Paper 2", score: 79, grade: "B+", credits: 1, remarks: "Very Good" },
            ],
        },
    ],
    summary: {
        totalMarks: 300,
        totalCredits: 12,
        average: 75,
        gpa: 3.8,
        division: "I",
        rank: 5,
    },
    attendance: { present: 90, absent: 2 },
    conduct: "Satisfactory",
    activities: "Chess Club",
    comments: {
        teacher: "Solid performance.",
        head: "Keep improving.",
    },
    grading: [
        { label: "A", range: "80–100", description: "Excellent" },
        { label: "B+", range: "75–79", description: "Very Good" },
        { label: "B", range: "70–74", description: "Good" },
        { label: "C", range: "60–69", description: "Credit" },
        { label: "D", range: "50–59", description: "Pass" },
        { label: "F", range: "0–49", description: "Fail" },
    ],

};
