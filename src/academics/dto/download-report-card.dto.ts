import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DownloadReportCardDto {
  @ApiProperty({
    description: 'Student ID for the report card download',
    example: 'uuid-of-student',
  })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({
    description: 'Academic Year ID for the report card download',
    example: 'uuid-of-academic-year',
  })
  @IsUUID()
  @IsNotEmpty()
  academicYearId!: string;

  @ApiProperty({
    description: 'Term template item ID for the report card download',
    example: 'uuid-of-term-template-item',
  })
  @IsUUID()
  @IsNotEmpty()
  termTemplateItemId!: string;
}
