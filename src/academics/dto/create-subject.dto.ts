import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({
    description: 'Subject name',
    example: 'Mathematics',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Subject code',
    example: 'MATH',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Subject description',
    example: 'Basic mathematics and algebra',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the subject is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
