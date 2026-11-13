import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { AMOUNT_REGEX, PAYMENT_METHODS, PAYMENT_STATUSES } from '../billing.constants';
import type { PaymentMethod, PaymentStatus } from '../billing.constants';

const toAmountString = ({ value }: { value: unknown }) => (typeof value === 'number' ? String(value) : value);

export class RecordPaymentDto {
  @ApiProperty({ example: '150000' })
  @Transform(toAmountString)
  @Matches(AMOUNT_REGEX, { message: 'amount must be a positive number with at most 2 decimals' })
  amount!: string;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS as unknown as string[])
  payment_method!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Bank slip / mobile money transaction id. Generated when omitted.' })
  @IsOptional() @IsString() @MaxLength(100)
  reference?: string;

  @ApiProperty({ example: '2026-02-10', description: 'Date the money was received; cannot be in the future' })
  @IsDateString()
  received_at!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) payer_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) payer_phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class ReversePaymentDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class ListPaymentsQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(PAYMENT_METHODS as unknown as string[]) method?: PaymentMethod;
  @IsOptional() @IsIn(PAYMENT_STATUSES as unknown as string[]) status?: PaymentStatus;
  @IsOptional() @IsUUID() studentId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}
