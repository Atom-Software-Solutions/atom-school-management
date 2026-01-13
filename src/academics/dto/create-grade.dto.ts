import { IsString, IsNotEmpty, IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGradeDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'uuid-of-student',
  })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    description: 'Assessment ID',
    example: 'uuid-of-assessment',
  })
  @IsUUID()
  @IsNotEmpty()
  assessmentId: string;

  @ApiProperty({
    description: 'Score obtained',
    example: 85.5,
  })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional({
    description: 'Letter grade (A, B, C, D, F)',
    example: 'A',
  })
  @IsString()
  @IsOptional()
  letterGrade?: string;

  @ApiPropertyOptional({
    description: 'Remarks',
    example: 'Excellent performance',
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}

