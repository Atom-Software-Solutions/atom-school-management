import { IsOptional, IsObject, IsString, MinLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Currency must be at least 3 characters' })
  currency?: string;

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Time zone must be at least 3 characters' })
  timeZone?: string;

  @IsObject()
  @IsOptional()
  customSettings?: Record<string, any>;
}
