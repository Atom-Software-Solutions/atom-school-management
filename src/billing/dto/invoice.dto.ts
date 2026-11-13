import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AMOUNT_REGEX } from '../billing.constants';

const toAmountString = ({ value }: { value: unknown }) => (typeof value === 'number' ? String(value) : value);

export class GenerateInvoicesDto {
  @ApiProperty() @IsUUID() academic_year_id!: string;
  @ApiProperty() @IsUUID() term_template_item_id!: string;
  @ApiPropertyOptional({ description: 'Limit to one class' })
  @IsOptional() @IsUUID() classroom_definition_id?: string;
  @ApiPropertyOptional({ type: [String], description: 'Limit to these students' })
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @IsUUID('all', { each: true }) student_ids?: string[];
}

export class InvoiceLineInputDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() fee_structure_id?: string | null;
  @ApiProperty() @IsUUID() fee_category_id!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) description!: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Max(1000) quantity?: number;
  @ApiProperty({ example: '25000' })
  @Transform(toAmountString)
  @Matches(AMOUNT_REGEX, { message: 'unit_amount must be a positive number with at most 2 decimals' })
  unit_amount!: string;
  @ApiPropertyOptional({ example: '0' })
  @IsOptional()
  @Transform(toAmountString)
  @Matches(AMOUNT_REGEX, { message: 'waived_amount must be a positive number with at most 2 decimals' })
  waived_amount?: string;
}

export class CreateAdhocInvoiceDto {
  @ApiProperty() @IsUUID() student_id!: string;
  @ApiProperty() @IsUUID() academic_year_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() term_template_item_id?: string;
  @ApiProperty({ example: '2026-03-01' }) @IsDateString() due_date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiProperty({ type: [InvoiceLineInputDto] })
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => InvoiceLineInputDto)
  lines!: InvoiceLineInputDto[];
}

export class UpdateDraftInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() due_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string | null;
  @ApiPropertyOptional({ type: [InvoiceLineInputDto], description: 'Replaces all lines' })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => InvoiceLineInputDto)
  lines?: InvoiceLineInputDto[];
}

export class CancelInvoiceDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class ListInvoicesQueryDto {
  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  overdue?: boolean;
  @IsOptional() @IsUUID() studentId?: string;
  @IsOptional() @IsUUID() classroomId?: string;
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsUUID() termId?: string;
  @IsOptional() @IsUUID() batchId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}
