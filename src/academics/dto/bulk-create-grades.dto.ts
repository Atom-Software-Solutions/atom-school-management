import { IsUUID, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BulkGradeItemDto } from './bulk-grade-item.dto';

export class BulkCreateGradesDto {
  @ApiProperty({
    description: 'Assessment ID',
    example: '2bbfdf69-fe9e-439a-a927-f1461238cbec',
  })
  @IsUUID()
  @IsNotEmpty()
  assessmentId!: string;

  @ApiProperty({
    description: 'Array of grades to create',
    type: [BulkGradeItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkGradeItemDto)
  grades!: BulkGradeItemDto[];
}
