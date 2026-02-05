import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClassroomDefinitionDto {
  @ApiPropertyOptional({
    description: 'Classroom definition name',
    example: 'Primary 1',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Classroom level (e.g., "Primary", "Secondary", "Nursery")',
    example: 'Primary',
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({
    description: 'Archive status',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @ApiPropertyOptional({
    description: 'Ordinal used for ordering classrooms (lower = earlier year)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  ordinal?: number;
}

