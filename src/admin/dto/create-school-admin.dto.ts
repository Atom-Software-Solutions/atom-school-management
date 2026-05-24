import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateSchoolAdminDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    schoolId: string;
}
