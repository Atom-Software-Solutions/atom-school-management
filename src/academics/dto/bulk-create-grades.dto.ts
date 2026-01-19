import { IsUUID, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateGradeDto } from './create-grade.dto';

export class BulkCreateGradesDto {
  @ApiProperty({
    description: 'Assessment ID',
    example: 'uuid-of-assessment',
  })
  @IsUUID()
  @IsNotEmpty()
  assessmentId: string;

  @ApiProperty({
    description: 'Array of grades to create',
    type: [CreateGradeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGradeDto)
  grades: CreateGradeDto[];
}

