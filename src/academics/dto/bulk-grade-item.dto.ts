import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BulkGradeItemDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'a4b248de-bb8b-4a60-aaed-5ebc22541522',
  })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({
    description: 'Score obtained',
    example: 85.5,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  score!: number;

  @ApiPropertyOptional({
    description: 'Letter grade (A, B, C, D, F)',
    example: 'A',
  })
  @IsString()
  @IsOptional()
  letterGrade?: string;

  @ApiPropertyOptional({
    description: 'Remarks',
    example: 'Good performance',
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
