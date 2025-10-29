import { IsOptional, IsObject, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsObject()
  @IsOptional()
  customSettings?: Record<string, any>;
}

