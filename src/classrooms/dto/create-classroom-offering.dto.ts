import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassroomOfferingDto {
  @ApiProperty({
    description: 'Classroom definition ID',
    example: 'uuid-of-classroom-definition',
  })
  @IsUUID()
  @IsNotEmpty()
  classroomDefinitionId!: string;

  @ApiPropertyOptional({
    description:
      'Display name for this offering (overrides definition name if provided)',
    example: 'Primary 1 - Section A',
  })
  @IsString()
  @IsOptional()
  displayName?: string;
}
