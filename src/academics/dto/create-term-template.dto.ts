import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TermStructureItemDto {
  @ApiProperty({
    description: 'Term ordinal number (1, 2, 3, etc.)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  ordinal!: number;

  @ApiProperty({
    description: 'Term name',
    example: 'Term 1',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, {
    message: 'Each Term Item name must be at least 3 characters',
  })
  name!: string;
}

export class CreateTermTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Standard 3-Term Template',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Template name must be at least 3 characters' })
  name!: string;

  @ApiProperty({
    description: 'Array of term definitions with ordinal and name',
    example: [
      { ordinal: 1, name: 'Term 1' },
      { ordinal: 2, name: 'Term 2' },
      { ordinal: 3, name: 'Term 3' },
    ],
    type: [TermStructureItemDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one term item must be provided' })
  @ValidateNested({ each: true })
  @Type(() => TermStructureItemDto)
  structure!: TermStructureItemDto[];
}
