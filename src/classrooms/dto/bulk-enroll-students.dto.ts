import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkEnrollStudentDto {
  @IsString()
  studentId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}

export class BulkEnrollStudentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEnrollStudentDto)
  enrollments: BulkEnrollStudentDto[];
}
