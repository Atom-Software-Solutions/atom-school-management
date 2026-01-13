import { PartialType } from '@nestjs/mapped-types';
import { CreateAssessmentDto } from './create-assessment.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, Min, Max } from 'class-validator';

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {
  @ApiPropertyOptional({
    description: 'Assessment name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Assessment type',
    enum: ['exam', 'test', 'assignment', 'project', 'quiz'],
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'Maximum possible score',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
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
    description: 'Whether results are published',
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

