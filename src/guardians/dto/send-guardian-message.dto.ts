import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendGuardianMessageDto {
    @IsString()
    @IsIn(['Email', 'SMS', 'WhatsApp'], {
        message: 'type must be one of Email, SMS, or WhatsApp',
    })
    type!: string;

    @IsString()
    @IsNotEmpty()
    message!: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    subject?: string;

    @IsString()
    @IsOptional()
    studentId?: string;
}
