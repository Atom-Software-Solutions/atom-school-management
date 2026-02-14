import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '1234567890',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^\+?\d{10,}$/, { message: "phone must be at least 10 digits, optionally prefixed with '+'" })
  phone?: string;

  @ApiPropertyOptional({
    description: 'School ID (optional, for parent registration)',
    example: 'school-uuid-here',
  })
  @IsString()
  @IsOptional()
  schoolId?: string;
}
