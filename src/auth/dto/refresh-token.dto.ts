import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token to get a new access token',
    example: 'refresh-token-here',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

