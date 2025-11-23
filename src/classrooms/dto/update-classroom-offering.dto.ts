import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClassroomOfferingDto {
  @ApiPropertyOptional({
    description: 'Display name for this offering',
    example: 'Primary 1 - Section A',
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

