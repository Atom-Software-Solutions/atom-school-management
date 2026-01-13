import { PartialType } from '@nestjs/mapped-types';
import { CreateGradeDto } from './create-grade.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateGradeDto extends PartialType(CreateGradeDto) {
  @ApiPropertyOptional({
    description: 'Score obtained',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({
    description: 'Letter grade',
  })
  @IsString()
  @IsOptional()
  letterGrade?: string;

  @ApiPropertyOptional({
    description: 'Remarks',
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}

