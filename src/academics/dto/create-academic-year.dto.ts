import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAcademicYearDto {
  @ApiProperty({
    description: 'Academic year name',
    example: '2024-2025',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Academic year name must be at least 3 characters' })
  name!: string;

  @ApiProperty({
    description: 'Academic year start date (ISO 8601)',
    example: '2024-09-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({
    description: 'Academic year end date (ISO 8601)',
    example: '2025-06-30T23:59:59.999Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiProperty({
    description: 'Term template ID to use for this academic year',
    example: 'uuid-of-term-template',
  })
  @IsUUID()
  @IsNotEmpty()
  termTemplateId!: string;
}
