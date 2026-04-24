import React from 'react';

// Type definitions
export interface ReportCardConfig {
    showCredits: boolean;
    useGPA: boolean;
    showRank: boolean;
    showAttendance: boolean;
    showConduct: boolean;
    showActivities: boolean;
}

export interface ReportCardData {
    school: {
        name: string;
        contact: string;
        motto: string;
    };
    term: {
        name: string;
        year: string;
        dates: string;
    };
    student: {
        name: string;
        regNo: string;
        class: string;
        stream: string;
    };
    subjects: Array<{
        name: string;
        score: number;
        grade: string;
        credits?: number;
        remarks: string;
    }>;
    summary: {
        totalMarks: number;
        totalCredits?: number;
        average: number;
        gpa?: number;
        division?: string;
        rank?: number;
    };
    attendance?: {
        present: number;
        absent: number;
    };
    conduct?: string;
    activities?: string;
    comments: {
        teacher: string;
        head: string;
    };
    grading: Array<{
        label: string;
        range: string;
        description: string;
    }>;
}

// 1. Header Component
function Header({
    school,
    term,
    student,
}: {
    school: ReportCardData['school'];
    term: ReportCardData['term'];
    student: ReportCardData['student'];
}) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderBottom: '1px solid #ccc',
            paddingBottom: '16px',
            marginBottom: '16px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    width: '96px',
                    height: '96px',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#6b7280',
                    border: '1px solid #ccc',
                    marginRight: '16px'
                }}>
                    Logo
                </div>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em',
                        color: '#111827',
                        textAlign: 'center'
                    }}>{school.name}</h1>
                    <div style={{
                        fontSize: '14px',
                        color: '#374151',
                        textAlign: 'center'
                    }}>{school.contact}</div>
                    <div style={{
                        fontStyle: 'italic',
                        fontSize: '12px',
                        color: '#6b7280',
                        textAlign: 'center'
                    }}>{school.motto}</div>
                </div>
                <div style={{
                    width: '96px',
                    height: '96px',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#6b7280',
                    border: '1px solid #ccc',
                    marginLeft: '16px',
                    overflow: 'hidden'
                }}>
                    {/* Replace below with <img src={student.avatarUrl} ... /> if available */}
                    Avatar
                </div>
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '8px',
                gap: '24px',
                fontSize: '14px'
            }}>
                <span style={{ fontWeight: '600' }}>{term.name}</span>
                <span>Academic Year: {term.year}</span>
                <span>Dates: {term.dates}</span>
            </div>
        </div>
    );
}

// 2. StudentInfo Component
function StudentInfo({ student }: { student: ReportCardData['student'] }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            marginBottom: '16px',
            fontSize: '14px'
        }}>
            <div><span style={{ fontWeight: '600' }}>Name:</span> {student.name}</div>
            <div><span style={{ fontWeight: '600' }}>Reg No:</span> {student.regNo}</div>
            <div><span style={{ fontWeight: '600' }}>Class/Program:</span> {student.class}</div>
            <div><span style={{ fontWeight: '600' }}>Stream/Dept:</span> {student.stream}</div>
        </div>
    );
}

// 3. AcademicTable Component
function AcademicTable({ subjects, showCredits }: { subjects: ReportCardData['subjects']; showCredits: boolean }) {
    return (
        <table style={{
            width: '100%',
            border: '1px solid #9ca3af',
            marginBottom: '16px',
            fontSize: '14px',
            borderCollapse: 'collapse'
        }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
                <tr>
                    <th style={{
                        border: '1px solid #9ca3af',
                        padding: '8px 4px'
                    }}>Subject</th>
                    <th style={{
                        border: '1px solid #9ca3af',
                        padding: '8px 4px'
                    }}>Score</th>
                    <th style={{
                        border: '1px solid #9ca3af',
                        padding: '8px 4px'
                    }}>Grade</th>
                    {showCredits && <th style={{
                        border: '1px solid #9ca3af',
                        padding: '8px 4px'
                    }}>Credits</th>}
                    <th style={{
                        border: '1px solid #9ca3af',
                        padding: '8px 4px'
                    }}>Remarks</th>
                </tr>
            </thead>
            <tbody>
                {subjects.map((sub, i) => (
                    <tr key={i}>
                        <td style={{
                            border: '1px solid #9ca3af',
                            padding: '8px 4px'
                        }}>{sub.name}</td>
                        <td style={{
                            border: '1px solid #9ca3af',
                            padding: '8px 4px',
                            textAlign: 'center'
                        }}>{sub.score}</td>
                        <td style={{
                            border: '1px solid #9ca3af',
                            padding: '8px 4px',
                            textAlign: 'center'
                        }}>{sub.grade}</td>
                        {showCredits && <td style={{
                            border: '1px solid #9ca3af',
                            padding: '8px 4px',
                            textAlign: 'center'
                        }}>{sub.credits ?? '-'}</td>}
                        <td style={{
                            border: '1px solid #9ca3af',
                            padding: '8px 4px'
                        }}>{sub.remarks}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// 4. PerformanceSummary Component
function PerformanceSummary({ summary, config }: { summary: ReportCardData['summary']; config: ReportCardConfig }) {
    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px',
            fontSize: '14px'
        }}>
            <div><span style={{ fontWeight: '600' }}>Total Marks:</span> {summary.totalMarks}</div>
            {config.showCredits && <div><span style={{ fontWeight: '600' }}>Total Credits:</span> {summary.totalCredits}</div>}
            <div><span style={{ fontWeight: '600' }}>Average:</span> {summary.average}</div>
            {config.useGPA ? (
                <div><span style={{ fontWeight: '600' }}>GPA:</span> {summary.gpa}</div>
            ) : (
                <div><span style={{ fontWeight: '600' }}>Division:</span> {summary.division}</div>
            )}
            {config.showRank && (
                <div><span style={{ fontWeight: '600' }}>Position:</span> {summary.rank}</div>
            )}
        </div>
    );
}

// 5. Optional Sections
function Attendance({ attendance }: { attendance?: ReportCardData['attendance'] }) {
    if (!attendance) return null;
    return (
        <div style={{
            marginBottom: '8px',
            fontSize: '14px'
        }}>
            <span style={{ fontWeight: '600' }}>Attendance:</span> Present: {attendance.present}, Absent: {attendance.absent}
        </div>
    );
}
function Conduct({ conduct }: { conduct?: string }) {
    if (!conduct) return null;
    return (
        <div style={{
            marginBottom: '8px',
            fontSize: '14px'
        }}>
            <span style={{ fontWeight: '600' }}>Conduct:</span> {conduct}
        </div>
    );
}
function Activities({ activities }: { activities?: string }) {
    if (!activities) return null;
    return (
        <div style={{
            marginBottom: '8px',
            fontSize: '14px'
        }}>
            <span style={{ fontWeight: '600' }}>Co-curricular Activities:</span> {activities}
        </div>
    );
}

// 6. Comments Component
function Comments({ comments }: { comments: ReportCardData['comments'] }) {
    return (
        <div style={{
            marginBottom: '16px',
            fontSize: '14px'
        }}>
            <div><span style={{ fontWeight: '600' }}>Teacher's Remark:</span> {comments.teacher}</div>
            <div><span style={{ fontWeight: '600' }}>Head Teacher/Dean Remark:</span> {comments.head}</div>
        </div>
    );
}

// 7. Signatures Component
function Signatures() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '80px',
            marginBottom: '16px'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{
                    borderTop: '2px solid #9ca3af',
                    width: '160px',
                    height: '0'
                }} />
                <span style={{
                    fontSize: '12px',
                    marginTop: '4px'
                }}>Class Teacher</span>
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{
                    borderTop: '2px solid #9ca3af',
                    width: '160px',
                    height: '0'
                }} />
                <span style={{
                    fontSize: '12px',
                    marginTop: '4px'
                }}>Head Teacher / Dean</span>
            </div>
        </div>
    );
}

// 8. Footer Component
function Footer({ grading }: { grading: ReportCardData['grading'] }) {
    return (
        <div style={{
            marginTop: '32px',
            paddingTop: '16px',
            borderTop: '1px solid #ccc',
            fontSize: '12px',
            color: '#374151'
        }}>
            <div style={{
                fontWeight: '600',
                marginBottom: '4px'
            }}>Grading Scale:</div>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                {grading.map((g, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 'bold'
                        }}>{g.label}</span>
                        <span>({g.range})</span>
                        <span>- {g.description}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Main ReportCard Component
export default function ReportCard({ data, config }: { data: ReportCardData; config: ReportCardConfig }) {
    return (
        <div style={{
            width: '210mm',
            margin: '0 auto',
            backgroundColor: 'white',
            padding: '32px',
            color: '#111827'
        }}>
            <Header school={data.school} term={data.term} student={data.student} />
            <StudentInfo student={data.student} />
            <AcademicTable subjects={data.subjects} showCredits={config.showCredits} />
            <PerformanceSummary summary={data.summary} config={config} />
            {config.showAttendance && <Attendance attendance={data.attendance} />}
            {config.showConduct && <Conduct conduct={data.conduct} />}
            {config.showActivities && <Activities activities={data.activities} />}
            <Comments comments={data.comments} />
            <Signatures />
            <Footer grading={data.grading} />
        </div>
    );
}
