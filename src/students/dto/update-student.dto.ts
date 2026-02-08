import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+?\d{10,}$/, { message: 'phone must be at least 10 digits, optionally prefixed with +' })
  phone?: string;

  @IsOptional()
  @Matches(/^(M|F|Male|Female)$/i, { message: "gender must be 'M' or 'F'" })
  gender?: string | null;

  @IsOptional()
  @Matches(/^(\d{2})-(\d{2})-(\d{4})$/, { message: 'dateOfBirth must be in DD-MM-YYYY format' })
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
