import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateReportCardDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'uuid-of-student',
  })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({
    description: 'Academic Year ID',
    example: 'uuid-of-academic-year',
  })
  @IsUUID()
  @IsNotEmpty()
  academicYearId!: string;

  @ApiProperty({
    description: 'Term template item ID (the specific term instance)',
    example: 'uuid-of-term-template-item',
  })
  @IsUUID()
  @IsNotEmpty()
  termTemplateItemId!: string;

  @ApiPropertyOptional({
    description: 'Include class rank',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeRank?: boolean;

  @ApiPropertyOptional({
    description: 'Automatically publish the report card',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  autoPublish?: boolean;
}
