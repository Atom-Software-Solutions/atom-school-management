import { ApiProperty } from '@nestjs/swagger';

class MembershipDto {
  @ApiProperty()
  schoolId!: string;

  @ApiProperty()
  schoolName!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ enum: ['PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'UNIVERSITY'] })
  institutionType!: 'PRIMARY_SCHOOL' | 'SECONDARY_SCHOOL' | 'UNIVERSITY';
}

export class ProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ required: false, nullable: true })
  phone?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    required: false,
    nullable: true,
  })
  lastLogin?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: [MembershipDto] })
  memberships!: MembershipDto[];
}

export default ProfileResponseDto;
