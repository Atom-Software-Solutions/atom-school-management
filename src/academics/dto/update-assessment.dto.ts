import { PartialType } from '@nestjs/mapped-types';
import { CreateAssessmentDto } from './create-assessment.dto';
import type { AssessmentType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for updating an assessment.
 *
 * **Important:** `yearId` and `termTemplateItemId` are immutable after creation and cannot be updated.
 * If you need to change the term context, delete the assessment and create a new one.
 */
export class UpdateAssessmentDto {
  @ApiPropertyOptional({
    description: 'Assessment name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Assessment type',
    enum: ['CAT', 'MIDTERM', 'END_OF_TERM', 'MOCK', 'FINAL', 'ASSIGNMENT', 'QUIZ'],
  })
  @IsOptional()
  type?: AssessmentType;

  @ApiPropertyOptional({
    description: 'Maximum possible score',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxScore?: number;

  @ApiPropertyOptional({
    description: 'Weight for grade calculation (0-1)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({
    description: 'Assessment date',
  })
  @IsDateString()
  @IsOptional()
  assessmentDate?: string;

  @ApiPropertyOptional({
    description: 'Due date for assignments',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
