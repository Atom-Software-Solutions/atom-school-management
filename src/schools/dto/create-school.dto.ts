import { IsString, IsEmail, IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

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
  @Matches(/^(?!.*--)[a-z-]+$/, {
    message: "domain can not contain special characters or numbers",
  })
  domain: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;
}

