import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
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
}

