import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';
import { AMOUNT_REGEX } from '../billing.constants';

const toAmountString = ({ value }: { value: unknown }) => (typeof value === 'number' ? String(value) : value);

export class CreateFeeAssignmentsDto {
  @ApiProperty() @IsUUID() fee_structure_id!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsUUID('all', { each: true })
  student_ids!: string[];
}

export class UpdateFeeAssignmentDto {
  @ApiPropertyOptional({ description: 'Replaces the structure amount for this student; null clears it' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Transform(toAmountString)
  @Matches(AMOUNT_REGEX, { message: 'amount_override must be a positive number with at most 2 decimals' })
  amount_override?: string | null;

  @ApiPropertyOptional({ example: '50000' })
  @IsOptional()
  @Transform(toAmountString)
  @Matches(AMOUNT_REGEX, { message: 'waived_amount must be a positive number with at most 2 decimals' })
  waived_amount?: string;

  @ApiPropertyOptional({ description: 'Required when waived_amount > 0' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  waiver_reason?: string;
}
