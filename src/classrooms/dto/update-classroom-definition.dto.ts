import { IsString, IsOptional, IsBoolean } from 'class-validator';
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
}

