import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AssessmentType } from '@prisma/client';

export class CreateAssessmentDto {
  @ApiProperty({
    description: 'Academic year ID',
    example: 'uuid-of-academic-year',
  })
  @IsUUID()
  @IsNotEmpty()
  yearId!: string;

  @ApiProperty({
    description: 'Term template item ID (the specific term instance)',
    example: 'uuid-of-term-template-item',
  })
  @IsUUID()
  @IsNotEmpty()
  termTemplateItemId!: string;

  @ApiProperty({
    description: 'Assessment component ID (e.g., Paper 1, Practical)',
    example: 'uuid-of-assessment-component',
  })
  @IsUUID()
  @IsNotEmpty()
  componentId!: string;

  @ApiProperty({
    description: 'Classroom definition ID where this assessment applies',
    example: 'uuid-of-classroom-definition',
  })
  @IsUUID()
  @IsNotEmpty()
  classroomDefinitionId!: string;

  @ApiProperty({
    description: 'Assessment name',
    example: 'Mid-Term Examination',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Assessment type',
    example: 'MIDTERM',
    enum: ['CAT', 'MIDTERM', 'END_OF_TERM', 'MOCK', 'FINAL', 'ASSIGNMENT', 'QUIZ'],
  })
  @IsNotEmpty()
  type!: AssessmentType;

  @ApiProperty({
    description: 'Maximum possible score',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  maxScore!: number;

  @ApiProperty({
    description: 'Weight for grade calculation (0-1)',
    example: 0.3,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight!: number;

  @ApiPropertyOptional({
    description: 'Assessment date',
    example: '2024-03-15T09:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Due date for assignments',
    example: '2024-03-20T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
