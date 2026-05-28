import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ComponentType } from '@prisma/client';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAssessmentComponentDto {
    @ApiProperty({
        description: 'Component name',
        example: 'Paper 1',
    })
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiPropertyOptional({
        description: 'Component code',
        example: 'P1',
    })
    @IsString()
    @IsOptional()
    code?: string;

    @ApiProperty({
        description: 'Component type',
        example: 'EXAM',
        enum: ['EXAM', 'ASSIGNMENT', 'PRACTICAL', 'TEST', 'PROJECT'],
    })
    @IsNotEmpty()
    type!: ComponentType;

    @ApiProperty({
        description: 'Maximum score for the component',
        example: 100,
    })
    @IsNumber()
    @IsNotEmpty()
    maxScore!: number;

    @ApiPropertyOptional({
        description: 'Whether the component is active',
        example: true,
        default: true,
    })
    @IsOptional()
    isActive?: boolean;
}
