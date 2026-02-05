import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassroomDefinitionDto {
  @ApiProperty({
    description: 'Classroom definition name',
    example: 'Primary 1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Classroom level (e.g., "Primary", "Secondary", "Nursery")',
    example: 'Primary',
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiProperty({
    description: 'Ordinal used for ordering classrooms (lower = earlier year)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  ordinal: number;
}

