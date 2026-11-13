import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateFeeCategoryDto {
  @ApiProperty({ example: 'Tuition' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'TUITION', description: 'Uppercase letters, digits and underscores' })
  @IsString()
  @Matches(/^[A-Z0-9_]{2,30}$/, { message: 'code must be 2-30 uppercase letters, digits or underscores' })
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}

export class UpdateFeeCategoryDto extends PartialType(CreateFeeCategoryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
