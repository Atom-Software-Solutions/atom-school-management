import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty({
    description: 'Unique school code',
    example: 'SCH001',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Code must be at least 3 characters' })
  code!: string;

  @ApiProperty({
    description: 'School name',
    example: 'Example High School',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  name!: string;

  @ApiProperty({
    description: 'School domain (lowercase, alphanumeric with hyphens allowed)',
    example: 'atom-256-school',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Domain must be at least 3 characters' })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .toString()
          .trim()
          .toLowerCase()
          // Replace spaces with '-'
          .replace(/\s+/g, '-')
          // Collapse multiple '-' into a single '-'
          .replace(/-+/g, '-')
      : value,
  )
  @Matches(/^(?!.*--)[a-z0-9-]+$/, {
    message: 'domain can only contain lowercase letters, numbers and hyphens',
  })
  domain!: string;

  @ApiProperty({
    description: 'School email address',
    example: 'contact@examplehighschool.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'School phone number',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @Matches(/^\+?\d{10,}$/, {
    message: 'Phone number must be at least 10 digits and can start with +.',
  })
  phone!: string;

  @ApiPropertyOptional({
    description: 'School address',
    example: '123 Main Street, City, Country',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @MinLength(3, { message: 'Address must be at least 3 characters' })
  address?: string | undefined;

  @ApiPropertyOptional({
    description: 'URL to school logo',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @MinLength(3, { message: 'Logo URL must be at least 3 characters' })
  logoUrl?: string | undefined;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @MinLength(3, { message: 'Currency must be at least 3 characters' })
  currency?: string | undefined;

  @ApiPropertyOptional({
    description: 'Time zone (IANA timezone)',
    example: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @MinLength(3, { message: 'Time zone must be at least 3 characters' })
  timeZone?: string | undefined;
}
