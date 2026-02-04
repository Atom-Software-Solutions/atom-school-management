import { IsString, IsEmail, IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty({
    description: 'Unique school code',
    example: 'SCH001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'School name',
    example: 'Example High School',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'School domain (lowercase, alphanumeric with hyphens allowed)',
    example: 'atom-256-school',
  })
  @IsString()
  @IsNotEmpty()
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
    message: "domain can only contain lowercase letters, numbers and hyphens",
  })
  domain: string;

  @ApiProperty({
    description: 'School email address',
    example: 'contact@examplehighschool.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'School phone number',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'School address',
    example: '123 Main Street, City, Country',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'URL to school logo',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Time zone (IANA timezone)',
    example: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  timeZone?: string;
}

