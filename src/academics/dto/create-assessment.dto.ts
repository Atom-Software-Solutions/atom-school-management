import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssessmentDto {
  @ApiProperty({
    description: 'Academic year ID',
    example: 'uuid-of-academic-year',
  })
  @IsUUID()
  @IsNotEmpty()
  yearId: string;

  @ApiProperty({
    description: 'Term name (as defined in the school term template)',
    example: 'Term 1',
  })
  @IsString()
  @IsNotEmpty()
  termName: string;

  @ApiProperty({
    description: 'Subject ID',
    example: 'uuid-of-subject',
  })
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({
    description: 'Classroom definition ID where this assessment applies',
    example: 'uuid-of-classroom-definition',
  })
  @IsUUID()
  @IsNotEmpty()
  classroomDefinitionId: string;

  @ApiProperty({
    description: 'Assessment name',
    example: 'Mid-Term Examination',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Assessment type',
    example: 'exam',
    enum: ['exam', 'test', 'assignment', 'project', 'quiz'],
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Maximum possible score',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  maxScore: number;

  @ApiProperty({
    description: 'Weight for grade calculation (0-1)',
    example: 0.3,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;

  @ApiPropertyOptional({
    description: 'Assessment date',
    example: '2024-03-15T09:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  assessmentDate?: string;

  @ApiPropertyOptional({
    description: 'Due date for assignments',
    example: '2024-03-20T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Whether results are published',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

