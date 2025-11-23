import { IsString, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TermStructureItemDto } from './create-term-template.dto';

export class UpdateTermTemplateDto {
  @ApiPropertyOptional({
    description: 'Template name',
    example: 'Standard 3-Term Template',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Array of term definitions with ordinal and name. For locked templates, can only add new terms (higher ordinals).',
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
  @IsOptional()
  structure?: TermStructureItemDto[];
}

