import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateReportCardDto {
  @ApiPropertyOptional({
    description: 'Single student ID (use either this or studentIds/classroomDefinitionId)',
    example: 'uuid-of-student',
  })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({
    description: 'Multiple student IDs for bulk generation',
    example: ['uuid-of-student-1', 'uuid-of-student-2'],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  @ArrayNotEmpty()
  studentIds?: string[];

  @ApiPropertyOptional({
    description: 'Classroom definition ID to generate for all enrolled students',
    example: 'uuid-of-classroom-definition',
  })
  @IsUUID()
  @IsOptional()
  classroomDefinitionId?: string;

  @ValidateIf((o) => !o.studentId && !o.studentIds && !o.classroomDefinitionId)
  @IsNotEmpty({ message: 'Either studentId, studentIds, or classroomDefinitionId must be provided' })
  validateTarget() {
    return this.studentId || this.studentIds || this.classroomDefinitionId;
  }

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
