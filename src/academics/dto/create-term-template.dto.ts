import { IsString, IsNotEmpty, IsArray, ValidateNested, ArrayMinSize, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TermStructureItemDto {
  @ApiProperty({
    description: 'Term ordinal number (1, 2, 3, etc.)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  ordinal: number;

  @ApiProperty({
    description: 'Term name',
    example: 'Term 1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateTermTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Standard 3-Term Template',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @ArrayMinSize(1, { message: 'structure must contain at least one term' })
  @ValidateNested({ each: true })
  @Type(() => TermStructureItemDto)
  structure: TermStructureItemDto[];
}

