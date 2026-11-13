import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FeeFrequency } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { AMOUNT_REGEX } from '../billing.constants';

const toAmountString = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : value;

export class CreateFeeStructureDto {
  @ApiProperty()
  @IsUUID()
  academic_year_id!: string;

  @ApiPropertyOptional({ description: 'TermTemplateItem id; omit for year-level fees' })
  @IsOptional()
  @IsUUID()
  term_template_item_id?: string | null;

  @ApiPropertyOptional({ description: 'ClassroomDefinition id; omit for school-wide fees' })
  @IsOptional()
  @IsUUID()
  classroom_definition_id?: string | null;

  @ApiProperty()
  @IsUUID()
  fee_category_id!: string;

  @ApiProperty({ example: 'P5 Tuition – Term 1 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: '450000.00', description: 'Decimal string, max 2 decimals' })
  @Transform(toAmountString)
  @Matches(AMOUNT_REGEX, { message: 'amount must be a positive number with at most 2 decimals' })
  amount!: string;

  @ApiPropertyOptional({ example: '2026-02-15' })
  @IsOptional()
  @IsDateString()
  due_date?: string | null;

  @ApiPropertyOptional({ enum: FeeFrequency, default: FeeFrequency.PER_TERM })
  @IsOptional()
  @IsEnum(FeeFrequency)
  frequency?: FeeFrequency;

  @ApiPropertyOptional({ default: true, description: 'false = only billed to assigned students' })
  @IsOptional()
  @IsBoolean()
  is_mandatory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateFeeStructureDto extends PartialType(CreateFeeStructureDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ListFeeStructuresQueryDto {
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsUUID() termId?: string;
  @IsOptional() @IsUUID() classroomId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  active?: boolean;
}

export class CopyFeeStructuresDto {
  @ApiProperty() @IsUUID() from_academic_year_id!: string;
  @ApiPropertyOptional({ description: 'Copy only this source term' })
  @IsOptional() @IsUUID() from_term_template_item_id?: string;
  @ApiProperty() @IsUUID() to_academic_year_id!: string;
  @ApiPropertyOptional({
    description: 'Target term. Required when from_term is given; otherwise terms are mapped by ordinal.',
  })
  @IsOptional() @IsUUID() to_term_template_item_id?: string;
  @ApiPropertyOptional({ description: 'Copy only structures of this class' })
  @IsOptional() @IsUUID() classroom_definition_id?: string;
}
