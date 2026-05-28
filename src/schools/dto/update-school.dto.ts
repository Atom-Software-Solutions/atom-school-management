import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateSchoolDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  name?: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?\d{10,}$/, {
    message: 'Phone number must be at least 10 digits and can start with +.',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Address must be at least 3 characters' })
  address?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Logo URL must be at least 3 characters' })
  logoUrl?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Currency must be at least 3 characters' })
  currency?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Time zone must be at least 3 characters' })
  timeZone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Motto must be at least 3 characters' })
  motto?: string;

  @IsEnum(['PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'UNIVERSITY'] as const, {
    message:
      'institutionType must be one of PRIMARY_SCHOOL, SECONDARY_SCHOOL, UNIVERSITY',
  })
  @IsOptional()
  institutionType?: 'PRIMARY_SCHOOL' | 'SECONDARY_SCHOOL' | 'UNIVERSITY';
}
