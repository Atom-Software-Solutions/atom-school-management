import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateSubjectDto } from './create-subject.dto';

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {
  @ApiPropertyOptional({
    description: 'Subject name',
    example: 'Advanced Mathematics',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Subject code',
    example: 'MATH',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Subject description',
    example: 'Advanced topics in mathematics',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Level (e.g., O-Level, A-Level, Grade 10)',
    example: 'A-Level',
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({
    description: 'Whether the subject is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
