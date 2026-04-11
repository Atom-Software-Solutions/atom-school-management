import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AcademicYearStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export class UpdateYearStatusDto {
  @ApiProperty({
    description: 'Academic year status',
    enum: AcademicYearStatus,
    example: 'active',
  })
  @IsEnum(AcademicYearStatus, {
    message: 'status must be one of: planned, active, closed',
  })
  @IsNotEmpty()
  status!: 'planned' | 'active' | 'closed';
}
