import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class StudentRelationDto {
    @IsString()
    @IsNotEmpty()
    id!: string;

    @IsOptional()
    @IsString()
    relation?: string;

    @IsOptional()
    @IsBoolean()
    is_primary?: boolean;
}

export class CreateGuardianDto {
    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @IsString()
    @IsNotEmpty()
    lastName!: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'students array must be non-empty' })
    @ValidateNested({ each: true })
    @Type(() => StudentRelationDto)
    students!: StudentRelationDto[];
}

export class UpdateGuardianDto {
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
    @IsString()
    phone?: string;
}

export class AddGuardianToStudentDto {
    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @IsString()
    @IsNotEmpty()
    lastName!: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    relation?: string;

    @IsOptional()
    @IsBoolean()
    is_primary?: boolean;
}
