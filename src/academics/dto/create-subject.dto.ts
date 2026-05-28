import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateAssessmentComponentDto } from './create-assessment-component.dto';

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

  @ApiPropertyOptional({
    description: 'Assessment components for this subject',
    type: [CreateAssessmentComponentDto],
    example: [
      {
        name: 'Paper 1',
        code: 'P1',
        type: 'EXAM',
        maxScore: 100,
        isActive: true,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentComponentDto)
  @IsOptional()
  components?: CreateAssessmentComponentDto[];
}
